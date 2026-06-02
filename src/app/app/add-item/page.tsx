import AddDonation from '@/components/AddDonation'
import { Metadata } from 'next';
import { addItem } from '../actions/items';
import { getCategories } from '../actions/categories';
import { getTokens } from 'next-firebase-auth-edge';
import { cookies } from 'next/headers';
import { authConfig } from '@/firebase/config/server-config';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: "List an item — Givny",
  description: "List a free item for your community",
};

export default async function AddDonationPage() {
    const tokens = await getTokens(await cookies(), authConfig);
    if (!tokens) redirect('/auth/login');

    const categories = await getCategories();
    return (
        <AddDonation addItem={addItem} categories={categories.data!} />
    )
}
