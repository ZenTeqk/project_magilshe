import React, { useContext, useEffect, useState } from "react";
import {
  CreateSubCategoryUrl,
  GetMainCategoryUrl,
} from "../../../Constant/urls/urls";
import { useDispatch, useSelector } from "react-redux";
import MainContext from "../../../context/MainContext";
import { PostApi } from "../../../hooks/Post/PostApi";
import {
  addSubCategoryReducerData,
  editSubCategoryReducerData,
} from "../../../redux/reducer/ChildReducer/SubCategoryReducer";
import { setMainCategoryReducerData } from "../../../redux/reducer/ChildReducer/MainCategoryReducer";
import { GetApi } from "../../../hooks/Get/GetApi";
import {Drawer,Field,NotesInput,PrimaryButton,SecondaryButton,SelectInput,TextInput} from "../../../admin/design-system";

const EditSubCategory = ({ show, setShow, editableData, setEditableData }) => {
  const dispatch = useDispatch();

  const { ShowNotification } = useContext(MainContext);
  const { main_category_reducer_data } = useSelector(
    (state) => state.MainCategoryReducer
  );

  let isEditableDataAvail = Boolean(Object.keys(editableData).length);
  const [cakeDetails, setCakeDetails] = useState({
    id: isEditableDataAvail ? editableData.id : 0,
    main_category: 0,
    name: "",
    description: "",
    meta_title: "",
    meta_description: "",
    slug: "",
    content: "",
  });

  const [preview, setPreview] = useState("");

  useEffect(() => {
    if (Object.keys(editableData).length) {
      setCakeDetails({
        ...editableData,
        main_category: editableData?.main_category?.id,
      });
      setPreview(editableData?.image_url || "");
    }
  }, [show, editableData]);
  useEffect(() => {
    getCategories();
  }, []);
  const getCategories = async () => {
    try {
      const result = await GetApi(GetMainCategoryUrl);
      
      if (!result || typeof result.status === "undefined") {
        ShowNotification("error", "Network Error");
      } else if (result.status !== 200) {
        ShowNotification("error", result.data?.message || "An error occurred");
      } else {
        dispatch(setMainCategoryReducerData(result.data.data));
      }
    } catch (error) {
      console.error("getCategories Error:", error);
      ShowNotification("error", "An unexpected error occurred");
    }
  };

  const handleClose = () => {
    setShow(false);
    setCakeDetails({
      id: 0,
      main_category: 0,
      name: "",
      description: "",
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

  const handleAddSubCategory = async () => {
    const formData = new FormData();

    if (!cakeDetails.name) {
      ShowNotification("warning", "Please Enter Category name");
      return;
    }
    if (!cakeDetails.main_category) {
      ShowNotification("warning", "Please Choose Main Category");
      return;
    }
    if (!cakeDetails.image && !editableData?.image_url) {
      ShowNotification("warning", "Please Select Image");
      return;
    }
    if (isEditableDataAvail) {
      formData.append("id", cakeDetails?.id);
    }
    formData.append("name", cakeDetails.name);
    formData.append("description", cakeDetails.description);
    formData.append("main_category", cakeDetails.main_category);
    formData.append("meta_title", cakeDetails.meta_title);
    formData.append("meta_description", cakeDetails.meta_description);
    formData.append("slug", cakeDetails.slug);
    formData.append("content", cakeDetails.content);

    if (cakeDetails.image) {
      formData.append("image", cakeDetails.image);
    }
    try {
      const result = await PostApi(CreateSubCategoryUrl, formData, true);

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
          dispatch(editSubCategoryReducerData(result.data?.data));
        } else {
          dispatch(addSubCategoryReducerData(result.data.data));
        }
        ShowNotification("success", result.data?.message);
      }
    } catch (error) {
      console.error("getCategories Error:", error);
      ShowNotification("error", "An unexpected error occurred");
    }
    handleClose();
  };

  return <Drawer open={show} title={isEditableDataAvail?"Edit subcategory":"Add subcategory"} onClose={handleClose} footer={<><SecondaryButton onClick={handleClose}>Cancel</SecondaryButton><PrimaryButton onClick={handleAddSubCategory}>{isEditableDataAvail?"Update subcategory":"Add subcategory"}</PrimaryButton></>}><div className="mads-form-grid"><Field label="Subcategory name" required><TextInput value={cakeDetails.name||""} onChange={event=>handleOnchange(event.target.value,"name")}/></Field><Field label="Main category" required><SelectInput value={cakeDetails.main_category||""} onChange={event=>handleOnchange(event.target.value,"main_category")}><option value="">Select category</option>{(main_category_reducer_data||[]).map(category=><option key={category.id} value={category.id}>{category.name}</option>)}</SelectInput></Field><Field label="Description"><NotesInput rows={3} value={cakeDetails.description||""} onChange={event=>handleOnchange(event.target.value,"description")}/></Field><Field label="Meta title"><TextInput value={cakeDetails.meta_title||""} onChange={event=>handleOnchange(event.target.value,"meta_title")}/></Field><Field label="Meta description"><NotesInput rows={3} value={cakeDetails.meta_description||""} onChange={event=>handleOnchange(event.target.value,"meta_description")}/></Field><Field label="Meta keywords"><NotesInput rows={3} value={cakeDetails.content||""} onChange={event=>handleOnchange(event.target.value,"content")}/></Field><Field label="Subcategory image" required={!isEditableDataAvail}><input type="file" accept="image/*" onChange={event=>handleOnchange(event.target.files[0],"image")}/></Field>{preview&&<img className="mads-management-image-preview" src={preview} alt="Subcategory preview"/>}</div></Drawer>;
};

export default EditSubCategory;
