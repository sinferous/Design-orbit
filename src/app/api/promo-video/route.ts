import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

function getResolvedVideoPath() {
  const primaryPath = path.join(process.cwd(), 'Promo video', 'Design_Orbit_Master_Promo.mp4');
  const fallbackPath = path.join(process.cwd(), 'public', 'videos', 'Design_Orbit_Master_Promo.mp4');

  if (fs.existsSync(primaryPath)) return primaryPath;
  if (fs.existsSync(fallbackPath)) return fallbackPath;
  return null;
}

export async function HEAD(req: NextRequest) {
  const resolvedPath = getResolvedVideoPath();
  if (!resolvedPath) {
    return new NextResponse(null, { status: 404 });
  }

  const stat = fs.statSync(resolvedPath);
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Accept-Ranges': 'bytes',
      'Content-Length': stat.size.toString(),
      'Content-Type': 'video/mp4',
    },
  });
}

export async function GET(req: NextRequest) {
  const resolvedPath = getResolvedVideoPath();
  if (!resolvedPath) {
    return new NextResponse('Video not found', { status: 404 });
  }

  const stat = fs.statSync(resolvedPath);
  const fileSize = stat.size;
  const range = req.headers.get('range');

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunkSize = end - start + 1;
    const nodeStream = fs.createReadStream(resolvedPath, { start, end });

    const webStream = new ReadableStream({
      start(controller) {
        nodeStream.on('data', chunk => controller.enqueue(chunk));
        nodeStream.on('end', () => controller.close());
        nodeStream.on('error', err => controller.error(err));
      },
      cancel() {
        nodeStream.destroy();
      },
    });

    return new NextResponse(webStream as any, {
      status: 206,
      headers: {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize.toString(),
        'Content-Type': 'video/mp4',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  }

  const nodeStream = fs.createReadStream(resolvedPath);
  const webStream = new ReadableStream({
    start(controller) {
      nodeStream.on('data', chunk => controller.enqueue(chunk));
      nodeStream.on('end', () => controller.close());
      nodeStream.on('error', err => controller.error(err));
    },
    cancel() {
      nodeStream.destroy();
    },
  });

  return new NextResponse(webStream as any, {
    status: 200,
    headers: {
      'Accept-Ranges': 'bytes',
      'Content-Length': fileSize.toString(),
      'Content-Type': 'video/mp4',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
