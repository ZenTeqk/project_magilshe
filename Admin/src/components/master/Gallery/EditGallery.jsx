import { faClose } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { useContext, useEffect, useRef, useState } from "react";
import MainContext from "../../../context/MainContext";
import { useDispatch } from "react-redux";
import { AddGalleryUrl } from "../../../Constant/urls/urls";
import { PostApi } from "../../../hooks/Post/PostApi";
import { addGalleryListReducerData } from "../../../redux/reducer/ChildReducer/GalleryListReducer";
import "./Gallery.scss";
import {Drawer,Field,PrimaryButton,SecondaryButton} from "../../../admin/design-system";

const EditGallery = ({ show, setShow, setEditableData }) => {
  const { ShowNotification } = useContext(MainContext);
  const { setIsApiLoading } = useContext(MainContext);

  const dispatch = useDispatch();

  const handleClose = () => {
    setShow(false);
    selectedImages.forEach(image=>URL.revokeObjectURL(image));
    previewUrls.current=[];
    setSelectedImages([]);
    setImagesFiles([]);
    setEditableData({});
  };

  const [selectedImages, setSelectedImages] = useState([]);
  const [imagesFiles, setImagesFiles] = useState([]);
  const previewUrls=useRef([]);

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    const imagesArray = files.map((file) => URL.createObjectURL(file));
    previewUrls.current=previewUrls.current.concat(imagesArray);
    setSelectedImages((prevImages) => prevImages.concat(imagesArray));
    setImagesFiles((prevFiles) => prevFiles.concat(files));

  };

  useEffect(()=>()=>previewUrls.current.forEach(image=>URL.revokeObjectURL(image)),[]);

  const removeImage = (index) => {
    URL.revokeObjectURL(selectedImages[index]);
    previewUrls.current=previewUrls.current.filter(image=>image!==selectedImages[index]);
    setSelectedImages(selectedImages.filter((_, i) => i !== index));
    setImagesFiles(imagesFiles.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    if (!imagesFiles.length) {
      ShowNotification("warning", "Please Choose Image");
      return;
    }
    setIsApiLoading(true)
    // let image_list = [];

    imagesFiles.forEach((image, index) => {
      // let imageObject = {
      //   id: 0,
      //   index: index,
      //   image: image,
      // };
      // image_list.push(imageObject);
      formData.append(`images`, image);
    });
    try{
      const result = await PostApi(AddGalleryUrl, formData, true);
      if (result.status !== 200) {
        ShowNotification("error", result.data.message);
        return;
      } else {
        ShowNotification("success", result.data.message);
        // result.data.data.map((val) => {
        //   dispatch(addGalleryListReducerData(val));
        // });
        result.data.data.forEach((val) => {
          dispatch(addGalleryListReducerData(val));
        });
        
      }
      handleClose();
    } catch (error) {
      // console.error("Kg Error:", error);
      ShowNotification("error", "An unexpected error occurred");
    } finally{
      setIsApiLoading(false)
    }
   

    
  };

  return <Drawer open={show} title="Add gallery images" onClose={handleClose} footer={<><SecondaryButton onClick={handleClose}>Cancel</SecondaryButton><PrimaryButton onClick={handleSubmit}>Upload images</PrimaryButton></>}><Field label="Gallery images" required helperText="Select one or more website-ready images."><input type="file" multiple accept="image/*" onChange={handleImageChange}/></Field><div className="mads-gallery-preview">
                {selectedImages.map((image, index) => (
                  <div key={image}><img src={image} alt={`Preview ${index+1}`}/><button type="button" aria-label={`Remove image ${index+1}`} onClick={()=>removeImage(index)}>
                      <FontAwesomeIcon icon={faClose} />
                    </button></div>
                ))}
  </div></Drawer>;
};

export default EditGallery;
