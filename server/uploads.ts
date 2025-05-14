import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';

const mkdir = promisify(fs.mkdir);
const writeFile = promisify(fs.writeFile);

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');

// Create the uploads directory if it doesn't exist
export const ensureUploadsDir = async () => {
  try {
    if (!fs.existsSync(UPLOADS_DIR)) {
      const publicDir = path.join(process.cwd(), 'public');
      if (!fs.existsSync(publicDir)) {
        await mkdir(publicDir);
      }
      await mkdir(UPLOADS_DIR);
    }
  } catch (error) {
    console.error('Failed to create uploads directory:', error);
    throw new Error('Failed to create uploads directory');
  }
};

// Save base64 image to file 
export const saveBase64Image = async (base64Data: string): Promise<string> => {
  await ensureUploadsDir();
  
  // Extract the base64 data (remove prefix like "data:image/jpeg;base64,")
  const base64Image = base64Data.split(';base64,').pop();
  
  if (!base64Image) {
    throw new Error('Invalid image data');
  }
  
  const fileExtension = base64Data.substring(
    base64Data.indexOf('/') + 1, 
    base64Data.indexOf(';')
  );
  
  // Generate a unique filename
  const fileName = `${uuidv4()}.${fileExtension}`;
  const filePath = path.join(UPLOADS_DIR, fileName);
  
  // Write the file
  await writeFile(filePath, base64Image, { encoding: 'base64' });
  
  // Return the relative URL to the uploaded file
  return `/uploads/${fileName}`;
};

// Delete image file
export const deleteImage = async (fileUrl: string): Promise<boolean> => {
  try {
    if (!fileUrl) return false;
    
    // Extract the filename from the URL
    const fileName = fileUrl.split('/').pop();
    if (!fileName) return false;
    
    const filePath = path.join(UPLOADS_DIR, fileName);
    
    // Check if file exists
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error deleting image:', error);
    return false;
  }
};