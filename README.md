# Photo Gallery Server, using AWS S3

This project is a Node.js application that provides an API for uploading and listing images using AWS S3. It uses Express for routing and Supertest for testing.

## Prerequisites

- Node.js
- npm
- AWS account with S3 access

## Installation

1. Clone the repository:
    ```sh
    git clone https://github.com/jcroot/photo-grid-server.git
    cd photo-grid-server
    ```

2. Install the dependencies:
    ```sh
    npm install
    ```

3. Set up your AWS credentials. You can do this by configuring the AWS CLI or by setting the following environment variables:
    ```sh
    export AWS_ACCESS_KEY_ID=<your-access-key-id>
    export AWS_SECRET_ACCESS_KEY=<your-secret-access-key>
    export AWS_REGION=<your-region>
    ```

## Running the Application

To start the application, run:
```sh
npm start
```

The server will start on the port specified in your environment variables or default to port 3000.

## API Endpoints

### POST /api/upload

Uploads files to S3 and returns image URLs.

**Request:**
- Method: POST
- URL: `/api/upload`
- Form Data: `images` (file)

**Response:**
- Status: 200 OK
- Body: JSON object containing image URLs

### GET /api/images

Lists files from the S3 bucket.

**Request:**
- Method: GET
- URL: `/api/images`

**Response:**
- Status: 200 OK
- Body: JSON array containing file keys and signed URLs

### GET /api/images/:width:height/:s3_object

Resizes an image to the specified width and height and returns a signed URL.

**Request:**
- Method: GET
- URL: `/api/images/:widthx:height/:s3_object`

**Response:**
- Status: 200 OK
- Body: Redirect to the signed URL of the resized image

## Running Tests

To run the tests, use:
```sh
npm test
```

The tests are written using Jest and Supertest.

## License

This project is licensed under the MIT License. See the `LICENSE` file for details.
