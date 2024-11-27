const express = require('express');
const cors = require('cors');
const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const multer = require('multer');
const { Readable } = require('stream');
require('dotenv').config();

const app = express();
const port = 8000;

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

// Create a new router
const apiRouter = express.Router();

// Define a route to handle file uploads
apiRouter.post('/upload', upload.array('images'), async (req, res) => {
    if (!req.files) {
        return res.status(400).send('No files were uploaded.');
    }

    try {
        const uploadPromises = req.files.map(file => {
            const fileStream = Readable.from(file.buffer);
            const uploadParams = {
                Bucket: process.env.S3_BUCKET_NAME,
                Key: `myuploads/${file.originalname}`,
                Body: fileStream,
            };
            const parallelUploads3 = new Upload({
                client: s3Client,
                params: uploadParams,
            });

            return parallelUploads3.done().then(() => ({
                thumbnailUrl: `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/myuploads/${file.originalname}`
            }));
        });

        const uploadedImages = await Promise.all(uploadPromises);
        console.log('Files uploaded successfully');
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
        const files = await Promise.all(data.Contents.map(async (file) => {
            const signedUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${file.Key}`;
            return { key: file.Key, signedUrl };
        }));
        res.status(200).json(files);
    } catch (err) {
        console.error(err);
        res.status(500).send('Failed to list files');
    }
});

// Mount the router on the /api path
app.use('/api', apiRouter);

// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
