import { useState, useContext, useEffect } from "react";
import { useDispatch } from "react-redux";
import {
  addMainCategoryReducerData,
  editMainCategoryReducerData,
} from "../../../redux/reducer/ChildReducer/MainCategoryReducer";
import { PostApi } from "../../../hooks/Post/PostApi";
import { CreateMainCategoryUrl } from "../../../Constant/urls/urls";
import MainContext from "../../../context/MainContext";
import {Drawer,Field,NotesInput,PrimaryButton,SecondaryButton,TextInput} from "../../../admin/design-system";

const EditCategory = ({ show, setShow, editableData, setEditableData }) => {
  const { ShowNotification } = useContext(MainContext);
  const isEditableDataAvail = Boolean(Object.keys(editableData).length);
  const dispatch = useDispatch();

  const [cakeDetails, setCakeDetails] = useState({
    id: 0,
    name: "",
    description: "",
    meta_title: "",
    meta_description: "",
    slug: "",
    content: "",
    image: null,
  });

  const [preview, setPreview] = useState("");

  useEffect(() => {
    if (Object.keys(editableData).length) {
      const { id, name, description, image_url,meta_title,meta_description,slug,content } = editableData;
      
      setCakeDetails({
        id: id || 0,
        name: name || "",
        description: description || "",
        meta_title: meta_title ||"",
        meta_description: meta_description ||"",
        slug: slug ||"",
        content: content ||"",
        // image: image_url || null,
      });
      setPreview(image_url || "");
    }
  }, [editableData, show]);

  const handleClose = () => {
    setShow(false);
    setCakeDetails({
      id: 0,
      name: "",
      description: "",
      image: null,
      meta_title: "",
      meta_description: "",
      slug: "",
      content: "",
    });
    setPreview("");
    setEditableData({});
  };

  const handleOnchange = (value, name) => {
    if (name === "image") {
      setCakeDetails((oldData) => ({
        ...oldData,
        [name]: value,
      }));
      setPreview(URL.createObjectURL(value));
    } else {
      setCakeDetails((oldData) => ({
        ...oldData,
        [name]: value,
        id: isEditableDataAvail ? editableData.id : 0,
      }));
    }
  };

  const handleAddMainCategory = async () => {
    const formData = new FormData();

    if (!cakeDetails.name) {
      ShowNotification("warning", "Please Enter Category name");
      return;
    }
    if (!cakeDetails.image && !cakeDetails?.id) {
      ShowNotification("warning", "Please Select Image");
      return;
    }
    
    if (Object.keys(editableData).length) {
      formData.append("id", cakeDetails?.id);
    }
    formData.append("name", cakeDetails.name);
    formData.append("description", cakeDetails.description);
    formData.append("meta_title", cakeDetails.meta_title);
    formData.append("meta_description", cakeDetails.meta_description);
    formData.append("slug", cakeDetails.slug);
    formData.append("content", cakeDetails.content);

    if (cakeDetails.image) {
      formData.append("image", cakeDetails.image);
    }
    try {
      const result = await PostApi(CreateMainCategoryUrl, formData, true);

      // if (result.status !== 200) {
      //   ShowNotification("error", result.data.message);
      //   return;
      // }

      if (!result || typeof result.status === "undefined") {
        ShowNotification("error", "Network Error");
      } else if (result.status !== 200) {
        ShowNotification("error", result.data?.message || "An error occurred");
      } else {
        if (isEditableDataAvail) {
          dispatch(editMainCategoryReducerData(result.data?.data));
        } else {
          dispatch(addMainCategoryReducerData(result.data?.data));
        }
        ShowNotification("success", result.data?.message);
      }
    } catch (error) {
      console.error("post category Error:", error);
      ShowNotification("error", "An unexpected error occurred");
    }

    handleClose();
  };

  return <Drawer open={show} title={isEditableDataAvail?"Edit main category":"Add main category"} onClose={handleClose} footer={<><SecondaryButton onClick={handleClose}>Cancel</SecondaryButton><PrimaryButton onClick={handleAddMainCategory}>{isEditableDataAvail?"Update category":"Add category"}</PrimaryButton></>}><div className="mads-form-grid"><Field label="Category name" required><TextInput value={cakeDetails.name||""} onChange={event=>handleOnchange(event.target.value,"name")}/></Field><Field label="Category description"><NotesInput rows={3} value={cakeDetails.description||""} onChange={event=>handleOnchange(event.target.value,"description")}/></Field><Field label="Meta title"><TextInput value={cakeDetails.meta_title||""} onChange={event=>handleOnchange(event.target.value,"meta_title")}/></Field><Field label="Meta description"><NotesInput rows={3} value={cakeDetails.meta_description||""} onChange={event=>handleOnchange(event.target.value,"meta_description")}/></Field><Field label="Meta keywords"><NotesInput rows={3} value={cakeDetails.content||""} onChange={event=>handleOnchange(event.target.value,"content")}/></Field><Field label="Category image" required={!isEditableDataAvail}><input type="file" accept="image/*" onChange={event=>handleOnchange(event.target.files[0],"image")}/></Field>{preview&&<img className="mads-management-image-preview" src={preview} alt="Category preview"/>}</div></Drawer>;
};

export default EditCategory;
