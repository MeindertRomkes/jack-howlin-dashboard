import path from 'path'
import fs from 'fs'
import dotenv from 'dotenv'

dotenv.config({ path: path.join(process.cwd(), '.env.local') })

import { downloadFile, runCliCommand } from '../lib/video-production'

async function main() {
  console.log('=================================================================')
  console.log('🎨 JACK HOWLIN - PROJECT STILLS GENERATIE')
  console.log('⚡ Locked Wardrobe Anchor (Tan Canvas Jacket + Henley Shirt)')
  console.log('=================================================================\n')

  const projPath = path.join(process.cwd(), 'projects', 'hate-me-all-you-want')
  const projectJsonPath = path.join(projPath, 'project.json')
  const stillsDir = path.join(projPath, 'stills')

  if (!fs.existsSync(stillsDir)) fs.mkdirSync(stillsDir, { recursive: true })

  const project = JSON.parse(fs.readFileSync(projectJsonPath, 'utf8'))
  console.log(`📁 Project: ${project.title} (${project.artist})`)
  console.log(`🧠 Soul ID: ${project.soul_id} (${project.soul_type})\n`)

  for (const shot of project.shots) {
    const destPath = path.join(stillsDir, `shot-${shot.shot_index}-still.png`)
    const metaPath = path.join(stillsDir, `shot-${shot.shot_index}-meta.json`)

    console.log(`📸 Shot ${shot.shot_index}/9: ${shot.title} [${shot.hat ? 'Met Hoed' : 'Zonder Hoed'}]...`)

    const args: string[] = ['generate', 'create']

    if (shot.still_model === 'soul_cinematic') {
      args.push(
        'soul_cinematic',
        '--prompt',
        `"${shot.still_prompt}"`,
        '--custom-reference-id',
        project.soul_id,
        '--aspect-ratio',
        '9:16',
        '--quality',
        '2k',
        '--wait',
        '--json'
      )
    } else {
      args.push(
        'gpt_image_2',
        '--prompt',
        `"${shot.still_prompt}"`,
        '--aspect-ratio',
        '9:16',
        '--quality',
        'high',
        '--wait',
        '--json'
      )
    }

    const output = await runCliCommand('higgsfield', args)
    const parsed = JSON.parse(output)
    const item = Array.isArray(parsed) ? parsed[0] : parsed
    const stillUrl = item?.result_url || item?.url

    if (!stillUrl) {
      throw new Error(`Geen result_url voor shot ${shot.shot_index}: ${output}`)
    }

    await downloadFile(stillUrl, destPath)
    const meta = {
      shot_index: shot.shot_index,
      title: shot.title,
      hat: shot.hat,
      stillPath: destPath,
      stillUrl,
      prompt: shot.still_prompt,
    }
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2))
    console.log(`   ✅ Still gereed: ${destPath}\n`)
  }

  console.log('=================================================================')
  console.log('✨ ALLE 9 STILLS GEREED IN: ' + stillsDir)
  console.log('=================================================================\n')
}

main().catch((err) => {
  console.error('\n❌ Fout bij stills generatie:', err)
  process.exit(1)
})
