import AddDonation from '@/components/AddDonation'
import { getCategories, getItem, updateItem } from '../../../actions/items';
import { addItem } from '../../../actions/items';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Edit donation",
  description: "Edit a listing on the platform",
};

export default async function EditItemPage({ params }: { params: { id: string } }   ) {
    const [categories, item] = await Promise.all([getCategories(), getItem(params.id)])
    return (
        <AddDonation addItem={addItem} editItem={updateItem} categories={categories.data!} defaultValues={item.data!} />
    )
}
