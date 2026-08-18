import { getCategories } from '@/app/app/actions/categories';
import { getInviterName } from '@/app/app/actions/leaderboard';
import UserRegister from '@/components/UserRegister'
import React from 'react'
import { registerUserAction } from '@/app/auth/actions/register'
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
    const [categories, inviterName] = await Promise.all([
        getCategories(),
        getInviterName(ref),
    ]);

    return (
        <UserRegister
            registerUserAction={registerUserAction}
            categories={categories.data!}
            referredBy={ref}
            inviterName={inviterName}
        />
    )
}
