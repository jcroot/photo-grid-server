const express = require('express');
const cors = require('cors');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
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
const upload = multer({ dest: 'uploads/' });

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
            const params = {
                Bucket: process.env.S3_BUCKET_NAME,
                Key: file.originalname,
                Body: fileStream,
            };
            return s3Client.send(new PutObjectCommand(params));
        });

        await Promise.all(uploadPromises);
        console.log('Files uploaded successfully');
        res.status(200).send('Files uploaded');
    } catch (err) {
        console.error(err);
        res.status(500).send('Failed to upload files');
    }
});

// Mount the router on the /api path
app.use('/api', apiRouter);

// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
