"use server";

import { db } from '@/db';
import { samplesTable } from '@/db/schema';
import fs from 'fs/promises';
import path from 'path';

export async function loadAllSamples() {
  // Construct the absolute path to your samples folder.
  const samplesDir = path.join(process.cwd(), 'samples');

  // Read all file names in the folder.
  const files = await fs.readdir(samplesDir);

  // Filter only .mp3 files (or other audio formats as needed)
  const mp3Files = files.filter((file) => file.endsWith('.mp3'));

  // Loop through the files and insert them into the database.
  for (const fileName of mp3Files) {
    const filePath = path.join(samplesDir, fileName);
    const fileData = await fs.readFile(filePath);
    await db.insert(samplesTable).values({
      name: fileName,
      sample: fileData,
    });
  }

  return { message: "Samples loaded successfully", count: mp3Files.length };
}
