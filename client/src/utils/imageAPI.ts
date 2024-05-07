import cloudinary from 'cloudinary';

// Configure Cloudinary
cloudinary.v2.config({
  cloud_name: 'dduoumojc',
  api_key: '556213698218321',
  api_secret: '4ctIVBdEtSuxytKILPwFggp_NxA'
});


export const uploadImage = async (imageFile: File): Promise<string | null> => {
    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('upload_preset', 'ml_default');

    /*try {
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
    }*/
    try {
      const response = await fetch('https://api.cloudinary.com/v1_1/dduoumojc/image/upload', {
        method: 'POST',
        body: formData,
      });
  
      if (!response.ok) {
        throw new Error('Failed to upload image to Cloudinary');
      }
  
      const data = await response.json();
      return data.secure_url; // This is the URL of the uploaded image
    } catch (error) {
      console.error('Failed to upload image to Cloudinary:', error);
      return null;
    }
  
};
