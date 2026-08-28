import { getCategories } from '@/app/app/actions/categories';
import { getInviterName } from '@/app/app/actions/leaderboard';
import UserRegister from '@/components/UserRegister'
import React from 'react'
import { registerUserAction } from '@/app/auth/actions/register'
import { previewMemberInvite } from '@/app/app/actions/memberInvites'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Register",
  description: "Create an account and explore listings",
};

export default async function RegisterPage({
    searchParams,
}: {
    searchParams: { [key: string]: string | string[] | undefined }
}) {
    const ref = typeof searchParams.ref === 'string' ? searchParams.ref : undefined;
    const inviteToken = typeof searchParams.invite === 'string' ? searchParams.invite : undefined;

    const [categories, referrerName, invite] = await Promise.all([
        getCategories(),
        getInviterName(ref),
        previewMemberInvite(inviteToken ?? ''),
    ]);

    // A member's referral link and an admin's invitation both say "somebody
    // asked you here", so they share the banner. The referral wins when both
    // are present: it is the one that earns the referrer points.
    return (
        <UserRegister
            registerUserAction={registerUserAction}
            categories={categories.data!}
            referredBy={ref}
            inviterName={referrerName ?? invite?.inviterName ?? null}
            invited={!!invite}
            inviteToken={invite ? inviteToken : undefined}
            invitedEmail={invite?.email}
        />
    )
}
