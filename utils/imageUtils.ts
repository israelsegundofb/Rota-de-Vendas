/**
 * Resizes an image file to a maximum dimension and converts it to a Base64 string.
 * Used to optimize profile pictures for Firestore storage.
 * 
 * @param file The File object (image) from an input element.
 * @param maxWidth Maximum width in pixels (default: 200).
 * @param maxHeight Maximum height in pixels (default: 200).
 * @param quality JPEG quality (0 to 1, default: 0.7).
 * @returns Promise resolving to the Base64 string.
 */
export const resizeImageToBase64 = (
    file: File,
    maxWidth = 200,
    maxHeight = 200,
    quality = 0.7
): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Calculate new dimensions maintaining aspect ratio
                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round((height *= maxWidth / width));
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round((width *= maxHeight / height));
                        height = maxHeight;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Could not get canvas context'));
                    return;
                }

                ctx.drawImage(img, 0, 0, width, height);
                // Convert to Base64 (JPEG for better compression)
                const dataUrl = canvas.toDataURL('image/jpeg', quality);
                resolve(dataUrl);
            };
            img.onerror = (error) => reject(error);
        };
        reader.onerror = (error) => reject(error);
    });
};
