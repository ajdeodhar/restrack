import { NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import { testConnection } from '@/lib/github';
import { getAuthedUser } from '@/lib/session';
import Anthropic from '@anthropic-ai/sdk';
import type { Settings } from '@/types';

export async function GET() {
  const auth = await getAuthedUser();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const settings = await storage.getSettings(auth.userId);
  const safe = { ...settings, ownAnthropicApiKey: settings.ownAnthropicApiKey ? '***' : '' };
  return NextResponse.json({ settings: safe, hasOwnAnthropicKey: !!settings.ownAnthropicApiKey });
}

export async function POST(req: Request) {
  const auth = await getAuthedUser();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = (await req.json()) as Partial<Settings>;
  const current = await storage.getSettings(auth.userId);

  await storage.saveSettings(auth.userId, {
    plan: body.plan ?? current.plan,
    ownAnthropicApiKey:
      body.ownAnthropicApiKey === '***' ? current.ownAnthropicApiKey : (body.ownAnthropicApiKey ?? ''),
    githubOwner: body.githubOwner ?? current.githubOwner,
    githubRepo: body.githubRepo ?? current.githubRepo,
    latexFilePath: body.latexFilePath ?? current.latexFilePath,
    branch: body.branch ?? current.branch,
  });

  return NextResponse.json({ ok: true });
}

export async function PUT(req: Request) {
  const auth = await getAuthedUser();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { test } = (await req.json()) as { test: 'github' | 'anthropic' };
  const settings = await storage.getSettings(auth.userId);

  if (test === 'github') {
    if (!auth.githubAccessToken) {
      return NextResponse.json({ ok: false, error: 'No GitHub session token — try signing in again.' });
    }
    const result = await testConnection({
      token: auth.githubAccessToken,
      owner: settings.githubOwner,
      repo: settings.githubRepo,
    });
    return NextResponse.json(result);
  }

  if (test === 'anthropic') {
    const apiKey = await storage.getEffectiveAnthropicKey(auth.userId);
    if (!apiKey) {
      return NextResponse.json({
        ok: false,
        error:
          settings.plan === 'paid'
            ? 'No shared Anthropic key is configured on the server.'
            : 'No Anthropic API key set.',
      });
    }
    try {
      const anthropic = new Anthropic({ apiKey });
      await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'ping' }],
      });
      return NextResponse.json({ ok: true });
    } catch (err: unknown) {
      return NextResponse.json({
        ok: false,
        error: err instanceof Error ? err.message : 'Invalid API key',
      });
    }
  }

  return NextResponse.json({ ok: false, error: 'Unknown test type' }, { status: 400 });
}
