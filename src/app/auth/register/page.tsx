import { getCategories } from '@/app/app/actions/categories';
import UserRegister from '@/components/UserRegister'
import React from 'react'
import { registerUserAction } from '@/app/auth/actions/register'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Register",
  description: "Create an account and explore listings",
};

export default async function RegisterPage() {
    const categories = await getCategories();
    return (
        <UserRegister registerUserAction={registerUserAction} categories={categories.data!} />
    )
}
