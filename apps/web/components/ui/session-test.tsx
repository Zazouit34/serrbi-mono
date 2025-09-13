"use client"

import { useCurrentUser } from "@/hooks/use-current-user"
import { ImageUploader } from "@/components/ui/image-uploader"
import { MultiImageUploader } from "@/components/ui/multi-image-uploader"



export default function SessionTest() {
  
const currentUser = useCurrentUser()
  

  
  return (
    <div>
      <h1>
        Session Test
        <br />
        {currentUser.user?.name}
        <br />
        {currentUser.user?.email}
        <br />
        {currentUser.user?.role}
        <br />
        {currentUser.user?.image}
        <br />
        {currentUser.user?.phone}
        <br />
        <ImageUploader
          label="Test Image Upload"
          onImageUpload={(file) => {
            console.log("🎯 Parent received file:", file);
            console.log("🎯 In real app, this would trigger S3 upload with URL callback");
          }}
          onImageSubmit={() => {
            console.log("🎯 Parent received remove event");
          }}
        />
      </h1>
      <div>
          <h2 className="mb-4 text-xl font-bold">🎨 Multi Image Uploader Test</h2>
          <MultiImageUploader
            label="Test Multiple Images Upload (Max 4)"
            maxImages={4}
            onImagesUpload={(files) => {
              console.log("🎯 Multi: Parent received files:", files);
              console.log("🎯 Multi: File names:", files.map(f => f.name));
            }}
            onImageRemove={(index) => {
              console.log("🎯 Multi: Parent received remove event for index:", index);
            }}
            onAllImagesRemove={() => {
              console.log("🎯 Multi: Parent received remove all event");
            }}
          />
        </div>
    </div>
  )
}
