import AddDonation from '@/components/AddDonation'
import { Metadata } from 'next';
import { addItem } from '../actions/items';
import { getCategories } from '../actions/categories';

export const metadata: Metadata = {
  title: "Add donation",
  description: "Add a new listing to the platform",
};

export default async function AddDonationPage() {
    const categories = await getCategories();
    return (
        <AddDonation addItem={addItem} categories={categories.data!} />
    )
}
