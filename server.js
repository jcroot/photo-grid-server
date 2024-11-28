const express = require('express');
const cors = require('cors');
const { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand  } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const multer = require('multer');
const { Readable } = require('stream');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 8000;

// Use cors middleware
app.use(cors());

// Set up AWS credentials
const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.ACCESS_KEY,
        secretAccessKey: process.env.SECRET_ACCESS_KEY,
    },
});

// Set up multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Add function to avoid DRY principle
const uploadFileToS3 = async (fileBuffer, key, contentType) => {
    const uploadParams = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: key,
        Body: fileBuffer,
        ContentType: contentType,
    };
    const upload = new Upload({ client: s3Client, params: uploadParams });
    await upload.done();
};

// Function to get the resized image key
const getResizedImageKey = (width, height, originalKey) => {
    return `resized/${width}x${height}/${originalKey}`;
};

// Create a new router
const apiRouter = express.Router();

// Function to sign URL from AWS
const generateSignedUrl = async (key) => {
    const params = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: key,
        Expires: 60 * 5,
    };
    const command = new GetObjectCommand(params);
    return await getSignedUrl(s3Client, command, { expiresIn: 300 });
};

// Define a route to handle file uploads
apiRouter.post('/upload', upload.array('images'), async (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).send('No files were uploaded.');
    }

    try {
        const uploadedImages = await Promise.all(
            req.files.map(async (file) => {
                const fileKey = `myuploads/${file.originalname}`;
                await uploadFileToS3(file.buffer, fileKey, file.mimetype);
                const thumbnailUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`;
                return { thumbnailUrl };
            })
        );
        res.status(200).json({ images: uploadedImages });
    } catch (err) {
        console.error(err);
        res.status(500).send('Failed to upload files');
    }
});

// Define a route to list all files in the S3 bucket
apiRouter.get('/images', async (req, res) => {
    try {
        const params = {
            Bucket: process.env.S3_BUCKET_NAME,
        };
        const data = await s3Client.send(new ListObjectsV2Command(params));
        const files = await Promise.all(
            data.Contents.map(async (file) => {
                const signedUrl = await generateSignedUrl(file.Key);
                return { key: file.Key, signedUrl };
            })
        );
        res.status(200).json(files);
    } catch (err) {
        console.error(err);
        res.status(500).send('Failed to list files');
    }
});

apiRouter.get('/images/:width(\\d+)x:height(\\d+)/:s3_object', async (req, res) => {
    const { width, height, s3_object } = req.params;
    const resizedKey = getResizedImageKey(width, height, s3_object);

    try {
        // Check if the resized image already exists
        try {
            await s3Client.send(new GetObjectCommand({
                Bucket: process.env.S3_BUCKET_NAME,
                Key: resizedKey,
            }));
            const signedUrl = await generateSignedUrl(resizedKey);
            return res.redirect(signedUrl);
        } catch (err) {
            if (err.name !== 'NoSuchKey') {
                throw err;
            }
        }

        // Get the original image and resize
        const originalImage = await s3Client.send(new GetObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: s3_object,
        }));

        // Determine the content type
        const contentType = s3_object.endsWith('.png') ? 'image/png' : 'image/jpeg';

        // Resize the image
        const resizedImageBuffer = await sharp(originalImage.Body)
            .resize(parseInt(width), parseInt(height))
            .toBuffer();

        // Upload the resized image to S3
        await uploadFileToS3(resizedImageBuffer, resizedKey, contentType);

        // Generate a signed URL for the resized image
        const signedUrl = await generateSignedUrl(resizedKey);
        res.redirect(signedUrl);
    } catch (err) {
        console.error(err);
        res.status(500).send('Failed to resize image');
    }
});

// Mount the router on the /api path
app.use('/api', apiRouter);

// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
