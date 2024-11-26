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
apiRouter.post('/upload', upload.single('file'), async (req, res) => {
    const fileStream = Readable.from(req.file.buffer);

    const params = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: req.file.originalname,
        Body: fileStream,
    };

    try {
        await s3Client.send(new PutObjectCommand(params));
        console.log('File uploaded successfully');
        res.status(200).send('File uploaded');
    } catch (err) {
        console.error(err);
        res.status(500).send('Failed to upload file');
    }
});

// Mount the router on the /api path
app.use('/api', apiRouter);

// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
