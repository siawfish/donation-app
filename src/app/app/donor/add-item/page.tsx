import AddDonation from '@/components/AddDonation'
import { getCategories } from '../actions/items';
import { addItem } from '../actions/items';

export default async function AddDonationPage() {
    const categories = await getCategories();
    return (
        <AddDonation addItem={addItem} categories={categories.data!} />
    )
}
