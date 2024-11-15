import AddDonation from '@/components/AddDonation'
import { getCategories } from '../../actions/items';
import { addItem } from '../../actions/items';
import { Metadata } from 'next';

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
