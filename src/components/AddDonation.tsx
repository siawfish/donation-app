'use client'

import { SaveIcon, XIcon } from "lucide-react"
import CustomButton from "./Button"
import CustomInput from "./CustomInput"
import CustomTextarea from "./CustomTextarea"
import DragAndDrop from "./ui/drag-n-drop"

export function AddDonation() {
  return (
    <div className="container max-w-6xl mx-auto px-4 lg:py-12">
      <div className="grid grid-cols-1 lg:grid-cols-[60%_40%]">
        <div className="flex flex-col justify-center gap-6 lg:mr-4">
          <div>
            <h1 className="text-3xl font-bold">Add an Item</h1>
            <p className="text-muted-foreground">Complete form to add a new item.</p>
          </div>
          <div className="flex flex-col justify-center gap-4 flex-1">
            <CustomInput label="Item Name" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CustomInput containerClassName="w-full" label="Category" />
              <CustomInput containerClassName="w-full" label="Condition" />
            </div>
            <CustomTextarea label="Item Description" />
          </div>
        </div>
        <DragAndDrop files={[]} onChange={() => { }} />
      </div>
      <div className="flex justify-end mt-6 gap-4">
        <CustomButton
          variant="outline"
          className="w-[150px] rounded-full text-lg py-6"
          icon={<XIcon className="w-4 h-4 text-destructive" />}
        >
          Cancel
        </CustomButton>
        <CustomButton
          className="w-[150px] rounded-full text-lg py-6"
          icon={<SaveIcon className="w-4 h-4" />}
        >
          Save
        </CustomButton>
      </div>
    </div>
  )
}
