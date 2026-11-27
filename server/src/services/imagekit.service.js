const ImageKit = require('@imagekit/nodejs');
const { toFile } = require('@imagekit/nodejs');

const imagekit = new ImageKit({
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY
});

async function uploadImage(buffer, fileName, folder = 'Tweet-clone') {
    const uploadedFile = await imagekit.files.upload({
        file: await toFile(buffer, fileName),
        fileName,
        folder
    });

    return uploadedFile.url;
}

module.exports = uploadImage;
