import { NextResponse } from 'next/server';
import {
  getServiceAdmin,
  getYoutubeUsageSummary,
  isAdminEmail,
  YOUTUBE_DAILY_QUOTA,
} from '@/lib/admin';
import { getRequestUser } from '@/lib/request-auth';

export async function GET() {
  try {
    const requestUser = await getRequestUser();
    if (!requestUser?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isAdminEmail(requestUser.email)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const admin = getServiceAdmin();
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    const [today, week] = await Promise.all([
      getYoutubeUsageSummary(admin, todayStart),
      getYoutubeUsageSummary(admin, new Date(Date.now() - 7 * 86400000)),
    ]);

    return NextResponse.json({
      daily_quota: YOUTUBE_DAILY_QUOTA,
      today,
      last_7_days: week,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
