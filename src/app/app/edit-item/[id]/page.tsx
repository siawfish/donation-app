import AddDonation from '@/components/AddDonation'
import { addItem, getItem, updateItem } from '../../actions/items';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Edit listing",
  description: "Edit a listing on the platform",
};

export default async function EditItemPage({ params }: { params: { id: string } }   ) {
    const item = await getItem(params.id)
    return (
        <AddDonation addItem={addItem} editItem={updateItem} defaultValues={item.data!} />
    )
}
