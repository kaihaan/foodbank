/**
 * Generate thumbnail versions of background images for the settings selector.
 *
 * Run with: bun scripts/generate-thumbnails.ts
 */

import sharp from 'sharp'
import { readdir, mkdir } from 'fs/promises'
import { join, parse } from 'path'

const BACKGROUNDS_DIR = join(import.meta.dir, '../public/backgrounds')
const THUMBNAILS_DIR = join(BACKGROUNDS_DIR, 'thumbnails')
const THUMBNAIL_WIDTH = 400 // 2x for retina on ~200px display
const QUALITY = 80

async function generateThumbnails() {
  console.log('Generating background thumbnails...\n')

  // Ensure thumbnails directory exists
  await mkdir(THUMBNAILS_DIR, { recursive: true })

  // Get all image files
  const files = await readdir(BACKGROUNDS_DIR)
  const imageFiles = files.filter(f =>
    /\.(jpg|jpeg|png|webp)$/i.test(f) && !f.startsWith('.')
  )

  console.log(`Found ${imageFiles.length} images to process:\n`)

  let totalOriginal = 0
  let totalThumbnail = 0

  for (const file of imageFiles) {
    const inputPath = join(BACKGROUNDS_DIR, file)
    const { name } = parse(file)
    const outputPath = join(THUMBNAILS_DIR, `${name}.webp`)

    try {
      // Get original file info
      const metadata = await sharp(inputPath).metadata()
      const originalSize = (await Bun.file(inputPath).arrayBuffer()).byteLength

      // Generate thumbnail
      await sharp(inputPath)
        .resize(THUMBNAIL_WIDTH, null, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .webp({ quality: QUALITY })
        .toFile(outputPath)

      // Get thumbnail size
      const thumbSize = (await Bun.file(outputPath).arrayBuffer()).byteLength

      totalOriginal += originalSize
      totalThumbnail += thumbSize

      const originalKB = (originalSize / 1024).toFixed(0)
      const thumbKB = (thumbSize / 1024).toFixed(0)
      const reduction = ((1 - thumbSize / originalSize) * 100).toFixed(0)

      console.log(`  ${file}`)
      console.log(`    ${metadata.width}x${metadata.height} → ${THUMBNAIL_WIDTH}px wide`)
      console.log(`    ${originalKB} KB → ${thumbKB} KB (${reduction}% smaller)\n`)

    } catch (err) {
      console.error(`  Error processing ${file}:`, err)
    }
  }

  const totalOriginalMB = (totalOriginal / 1024 / 1024).toFixed(1)
  const totalThumbKB = (totalThumbnail / 1024).toFixed(0)
  const totalReduction = ((1 - totalThumbnail / totalOriginal) * 100).toFixed(0)

  console.log('─'.repeat(50))
  console.log(`\nTotal: ${totalOriginalMB} MB → ${totalThumbKB} KB (${totalReduction}% smaller)`)
  console.log(`\nThumbnails saved to: ${THUMBNAILS_DIR}`)
}

generateThumbnails().catch(console.error)
