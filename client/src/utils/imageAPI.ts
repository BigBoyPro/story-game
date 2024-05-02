const IMGUR_CLIENT_ID = '14c652722afe251'; // Replace this with your actual Client ID from Imgur

export const uploadImage = async (imageFile: File): Promise<string | null> => {
    const formData = new FormData();
    formData.append('image', imageFile);

    try {
        const response = await fetch('https://api.imgur.com/3/image', {
            method: 'POST',
            headers: {
                'Authorization': `Client-ID ${IMGUR_CLIENT_ID}`,
                'Accept': 'application/json'
            },
            body: formData,
        });

        const data = await response.json(); // Parsing the JSON response body

        if (data.success) {
            return data.data.link; // Returns the URL of the uploaded image
        } else {
            console.error('Error uploading image:', data);
            return null;
        }
    } catch (error) {
        console.error('Error uploading image:', error);
        return null;
    }
};
