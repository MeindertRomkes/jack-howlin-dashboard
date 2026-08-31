import path from 'path'
import fs from 'fs'
import dotenv from 'dotenv'

dotenv.config({ path: path.join(process.cwd(), '.env.local') })

import { downloadFile, runCliCommand } from '../lib/video-production'

async function main() {
  const shotIndex = parseInt(process.argv[2] || '2', 10)
  const projPath = path.join(process.cwd(), 'projects', 'hate-me-all-you-want')
  const projectJsonPath = path.join(projPath, 'project.json')
  const stillsDir = path.join(projPath, 'stills')

  const project = JSON.parse(fs.readFileSync(projectJsonPath, 'utf8'))
  const shot = project.shots.find((s: any) => s.shot_index === shotIndex)
  if (!shot) throw new Error(`Shot ${shotIndex} not found in project.json`)

  const destPath = path.join(stillsDir, `shot-${shot.shot_index}-still.png`)
  const metaPath = path.join(stillsDir, `shot-${shot.shot_index}-meta.json`)

  console.log(`📸 Regenerating Shot ${shot.shot_index}/9: ${shot.title}...`)
  console.log(`Prompt: ${shot.still_prompt}`)

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
  console.log(`\n✅ Still gereed en opgeslagen: ${destPath}\n`)
}

main().catch((err) => {
  console.error('\n❌ Fout bij still generatie:', err)
  process.exit(1)
})
