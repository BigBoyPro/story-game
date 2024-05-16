

export const uploadImage = async (imageFile: File): Promise<string | null> => {
    const formData = new FormData();
    formData.append('file', imageFile);
    formData.append("cloud_name","dduoumojc")
    formData.append('upload_preset', 'tag3zydx');

    try {
        const response = await fetch('https://api.cloudinary.com/v1_1/dduoumojc/image/upload', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            console.error('Response status:', response.status, 'Status text:', response.statusText);
            return null;
        }

        const data = await response.json();
        return data.secure_url; // This is the URL of the uploaded image
    } catch (error) {
        console.error('Failed to upload image to Cloudinary:', error);
        return null;
    }
};
