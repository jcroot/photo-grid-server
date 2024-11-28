const request = require('supertest');
const { S3Client } = require('@aws-sdk/client-s3');
const app = require('./server.js'); // Replace with the correct path to your app file

jest.mock('@aws-sdk/client-s3', () => ({
    S3Client: jest.fn(),
    ListObjectsV2Command: jest.fn(),
}));
jest.mock('@aws-sdk/lib-storage', () => ({
    Upload: jest.fn().mockImplementation(() => ({
        done: jest.fn().mockResolvedValue(),
    })),
}));

const mockS3Client = {
    send: jest.fn(),
};
S3Client.mockImplementation(() => mockS3Client);

describe('API Router', () => {
    describe('POST /api/upload', () => {
        it('should upload files to S3 and return image URLs', async () => {
            const mockFile = Buffer.from('test-file-content');
            const response = await request(app)
                .post('/api/upload')
                .attach('images', mockFile, 'test-file.jpg');

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('images');
            expect(response.body.images).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        thumbnailUrl: expect.stringMatching(/^https:\/\//),
                    }),
                ])
            );
        });

        it('should return a 400 status when no files are uploaded', async () => {
            const response = await request(app).post('/api/upload');

            expect(response.status).toBe(400);
            expect(response.text).toBe('No files were uploaded.');
        });

        it('should return a 500 status on upload failure', async () => {
            mockS3Client.send.mockRejectedValueOnce(new Error('S3 Error'));

            const mockFile = Buffer.from('test-file-content');
            const response = await request(app)
                .post('/api/upload')
                .attach('images', mockFile, 'test-file.jpg');

            expect(response.status).toBe(500);
            expect(response.text).toBe('Failed to upload files');
        });
    });

    describe('GET /api/images', () => {
        it('should list files from S3 bucket', async () => {
            mockS3Client.send.mockResolvedValueOnce({
                Contents: [
                    { Key: 'file1.jpg' },
                    { Key: 'file2.png' },
                ],
            });

            const response = await request(app).get('/api/images');

            expect(response.status).toBe(200);
            expect(response.body).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ key: 'file1.jpg', signedUrl: expect.any(String) }),
                    expect.objectContaining({ key: 'file2.png', signedUrl: expect.any(String) }),
                ])
            );
        });

        it('should return a 500 status on error', async () => {
            mockS3Client.send.mockRejectedValueOnce(new Error('S3 Error'));

            const response = await request(app).get('/api/images');

            expect(response.status).toBe(500);
            expect(response.text).toBe('Failed to list files');
        });
    });
});
