import React, { useContext, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import MainContext from "../../../src/context/MainContext";
import { GetSubCategoryUrl, GetTaxCategoryUrl, ItemsUrl } from "../../Constant/urls/urls";
import { PostApi } from "../../hooks/Post/PostApi";
import { addItemReducerData, editItemReducerData } from "../../redux/reducer/ChildReducer/ItemReducer";
import { PutApi } from "../../hooks/Post/PutApi";
import { setSubCategoryReducerData } from "../../redux/reducer/ChildReducer/SubCategoryReducer";
import { GetApi } from "../../hooks/Get/GetApi";
import { setTaxCategoryReducerData } from "../../redux/reducer/ChildReducer/TaxCategoryReducer";
import {Drawer,Field,NotesInput,NumberInput,PrimaryButton,SecondaryButton,SelectInput,TextInput} from "../../admin/design-system";

const AddItem = ({ show, setShow, editableData, setEditableData }) => {
  const { ShowNotification } = useContext(MainContext);
  const { sub_category_reducer_data } = useSelector(
    (state) => state.SubCategoryReducer
  );

  const { tax_category_reducer_data } = useSelector(
    (state) => state.TaxCategoryReducer
  );

  const dispatch = useDispatch();
  let isEditableDataAvail = Boolean(Object.keys(editableData).length);

  const [itemDetails, setItemDetails] = useState({
    name: "",
    category: "",
    description: "",
    hsn_code: "",
    purchase_price: 0.0,
    mrp_price: 0.0,
    retail_price: 0.0,
    wholesale_price: 0.0,
    receiving_quantity: 0.0,
    is_serialized: false,
    is_stock: false,
    is_deleted: false,
    unit: {},
  });

  useEffect(() => {
    getSubCategories();
    getTaxCategories();
  }, []);

  const getSubCategories = async () => {
    try {
      const result = await GetApi(GetSubCategoryUrl);
      
      if (!result || typeof result.status === "undefined") {
        ShowNotification("error", "Network Error");
      } else if (result.status !== 200) {
        ShowNotification("error", result.data?.message || "An error occurred");
      } else {
        dispatch(setSubCategoryReducerData(result.data.data));
      }
    } catch (error) {
      console.error("getSubCategories Error:", error);
      ShowNotification("error", "An unexpected error occurred");
    }
  };

  const getTaxCategories = async () => {
    try {
      const result = await GetApi(GetTaxCategoryUrl);
      
      if (!result || typeof result.status === "undefined") {
        ShowNotification("error", "Network Error");
      } else if (result.status !== 200) {
        ShowNotification("error", result.data?.message || "An error occurred");
      } else {
        dispatch(setTaxCategoryReducerData(result?.data?.data));
      }
    } catch (error) {
      console.error("get Tax Categories Error:", error);
      ShowNotification("error", "An unexpected error occurred");
    }
  };

  useEffect(() => {
    if (Object.keys(editableData).length) {
      const updatedData = {
        ...editableData,
        category: editableData?.category?.id,
        tax_category: editableData?.tax_category?.id
      };

      setItemDetails(updatedData);
      
    }
  }, [show, editableData]);

  const handleClose = () => {
    setShow(false);
    setItemDetails({
      id: 0,
      name: "",
      category: "",
      description: "",
      hsn_code: "",
      purchase_price: 0,
      mrp_price: 0,
      retail_price: 0,
      wholesale_price: 0,
      receiving_quantity: 0,
      is_serialized: false,
      is_stock: false,
      is_deleted: false,
      unit: {},
    });
    setEditableData({});
  };

  const handleOnchange = (value, name) => {
    setItemDetails((oldData) => ({
      ...oldData,
      [name]: value,
      id: isEditableDataAvail ? editableData.id : 0,
    }));
  };

  const handleSubmitItem = async (e) => {
    e.preventDefault();

    const requestData = itemDetails;
    const isUpdate = Boolean(requestData?.id);
    const apiUrl = isUpdate ? `${ItemsUrl}/${requestData.id}` : ItemsUrl;
    const apiMethod = isUpdate ? PutApi : PostApi;

    try {
      const result = await apiMethod(apiUrl, requestData);

      if (result.status === (isUpdate ? 200 : 201)) {
        ShowNotification("success", result.data.message);
        const action = isEditableDataAvail ? editItemReducerData : addItemReducerData;
        dispatch(action(result.data?.data));
        handleClose();
      } else {
        ShowNotification("error", result.data.message);
      }
    } catch (error) {
      ShowNotification("error", "An error occurred while processing the request.");
    }
  };


  return <Drawer open={show} title={isEditableDataAvail?"Edit item":"Add item"} onClose={handleClose} footer={<><SecondaryButton onClick={handleClose}>Cancel</SecondaryButton><PrimaryButton onClick={handleSubmitItem}>{isEditableDataAvail?"Update item":"Add item"}</PrimaryButton></>}><div className="mads-form-grid"><Field label="Item name" required span={6}><TextInput value={itemDetails.name||""} onChange={event=>handleOnchange(event.target.value,"name")}/></Field><Field label="Category" span={6}><SelectInput value={itemDetails.category||""} onChange={event=>handleOnchange(event.target.value,"category")}><option value="">Select category</option>{(sub_category_reducer_data||[]).map(category=><option key={category.id} value={category.id}>{category.name}</option>)}</SelectInput></Field><Field label="Description"><NotesInput rows={3} value={itemDetails.description||""} onChange={event=>handleOnchange(event.target.value,"description")}/></Field><Field label="Tax category" span={6}><SelectInput value={itemDetails.tax_category||""} onChange={event=>handleOnchange(event.target.value,"tax_category")}><option value="">Select tax</option>{(tax_category_reducer_data||[]).map(tax=><option key={tax.id} value={tax.id}>{tax.tax_category}</option>)}</SelectInput></Field><Field label="HSN code" span={6}><TextInput value={itemDetails.hsn_code||""} onChange={event=>handleOnchange(event.target.value,"hsn_code")}/></Field>{[["Receiving quantity","receiving_quantity"],["Purchase price","purchase_price"],["MRP price","mrp_price"],["Wholesale price","wholesale_price"],["Retail price","retail_price"]].map(([label,key])=><Field label={label} span={6} key={key}><NumberInput value={itemDetails[key]||0} onChange={event=>handleOnchange(event.target.value,key)}/></Field>)}<div className="mads-check-grid">{[["Serialized","is_serialized"],["Stock item","is_stock"],["Deleted","is_deleted"]].map(([label,key])=><label key={key}><input type="checkbox" checked={Boolean(itemDetails[key])} onChange={event=>handleOnchange(event.target.checked,key)}/><span>{label}</span></label>)}</div></div></Drawer>;
};

export default AddItem;
