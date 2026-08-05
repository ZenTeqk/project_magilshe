import React, { useCallback, useContext, useEffect, useState } from "react";
import MainContext from "../../context/MainContext";
import {
  GetConfigurationUrl,
  UpdateConfigurationUrl,
} from "../../Constant/urls/urls";
import { setConfigReducerData } from "../../redux/reducer/ChildReducer/ConfigReducer";
import { useDispatch, useSelector } from "react-redux";
import { PostApi } from "../../hooks/Post/PostApi";
import { GetApi } from "../../hooks/Get/GetApi";
import { SettingsPageTemplate } from "../../admin/templates";
import { EmptyState, Field, FormSection, LoadingState, NotesInput, PhoneInput, PrimaryButton, SecondaryButton, TextInput } from "../../admin/design-system";

const emptyConfiguration = {
  id: 0,
  name: "",
  company_address: "",
  email: "",
  website: "",
  mobile: "",
  company_fax: "",
  gst_number: "",
  food_license_number: "",
  map_iframe_link: "",
  description: "",
  return_policy: "",
  meta: "",
  image: null,
  greeting_text: "",
};

const isConfigurationRecord = value => Boolean(value && !Array.isArray(value) && typeof value === "object" && Object.keys(value).length);

const Config = () => {
  const { ShowNotification,setIsApiLoading } = useContext(MainContext);
  const dispatch = useDispatch();

  const { config_reducer_data } = useSelector((state) => state.ConfigReducer);
  const { is_config_loading } = useSelector(
    (state) => state.CommonLoaderReducer
  );
  const [companyDetails, setCompanyDetails] = useState(emptyConfiguration);

  const [preview, setPreview] = useState("");
  const [pageLoading, setPageLoading] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);


  useEffect(() => {
    if (isConfigurationRecord(config_reducer_data)) {
      setCompanyDetails({...emptyConfiguration,...config_reducer_data});
      setPreview(config_reducer_data?.url || "");
    }
  }, [config_reducer_data]);

  const loadConfiguration = useCallback(async () => {
    setPageLoading(true);
    setLoadFailed(false);
    try {
      const result = await GetApi(GetConfigurationUrl);
      if (result?.status === 200 && isConfigurationRecord(result.data?.data)) {
        dispatch(setConfigReducerData(result.data.data));
      } else {
        setLoadFailed(true);
      }
    } catch (error) {
      console.error("getConfiguration Error:", error);
      setLoadFailed(true);
    } finally {
      setPageLoading(false);
    }
  }, [dispatch]);

  useEffect(() => {
    if (!is_config_loading && !isConfigurationRecord(config_reducer_data)) loadConfiguration();
  }, [config_reducer_data, is_config_loading, loadConfiguration]);

  const handleOnchange = (value, name) => {
    
    if (name === "image") {
      setPreview(URL.createObjectURL(value));
      
      setCompanyDetails((oldData) => ({
        ...oldData,
        image: value,
      }));
    } else {
      setCompanyDetails((oldData) => ({
        ...oldData,
        [name]: value,
      }));
    }
  };

  const handleValidate = (msg, value, name) => {
    if (value) {
      switch (name) {
        case "phone":
          const regex_mobile = /^[6-9]\d{9}$/;
          const is_valid_mobile = regex_mobile.test(value);
          if (!is_valid_mobile) {
            ShowNotification("error", "Please enter a valid 10-digit mobile number");
            return false;
          }
          break;
        case "email":
          const regex_email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          const is_valid_email = regex_email.test(value);
          if (!is_valid_email) {
            ShowNotification("error", "Please enter a valid email address");
            return false;
          }
          break;

        default:
          break;
      }
    } else {
      ShowNotification("error", msg);
      return false;
    }
    return true;
  };



  const handleSave = async () => {
    
    const formdata = new FormData();
    if (!companyDetails.name) return handleValidate("Enter Company Name");
    if (!companyDetails.mobile) return handleValidate("Enter Mobile Number");
    if (!companyDetails.email) return handleValidate("Enter Email Address");

    if (!companyDetails.company_address)
      return handleValidate("Enter Company Address");
    if (!companyDetails.image && !companyDetails.url)
      return handleValidate("Please Choose Company Logo");

    if (!handleValidate("", companyDetails.mobile, "phone")) return;
    if (!handleValidate("", companyDetails.email, "email")) return;

    formdata.append("id", companyDetails?.id || 0);
    formdata.append("name", companyDetails?.name);
    formdata.append("company_address", companyDetails?.company_address);
    formdata.append("email", companyDetails?.email);
    formdata.append("website", companyDetails?.website);
    formdata.append("mobile", companyDetails?.mobile);
    formdata.append("company_fax", companyDetails?.company_fax || "");
    formdata.append("gst_number", companyDetails?.gst_number);
    formdata.append("food_license_number", companyDetails?.food_license_number);
    formdata.append("map_iframe_link", companyDetails?.map_iframe_link);
    formdata.append("description", companyDetails?.description);
    formdata.append("return_policy", companyDetails?.return_policy);
    formdata.append("meta", JSON.stringify(companyDetails?.meta));
    formdata.append("greeting_text", companyDetails?.greeting_text || "");
    if(companyDetails?.image){
      formdata.append("image", companyDetails?.image);
    }

    setIsApiLoading(true);
    try {
      const result = await PostApi(UpdateConfigurationUrl, formdata);
      
      if (!result || typeof result.status === "undefined") {
        ShowNotification("error", "Network Error");
      } else if (result.status !== 200) {
        ShowNotification("error", result.data?.message || "An error occurred");
      } else {
        ShowNotification("success","Configuration Save Sucessfully")
        dispatch(setConfigReducerData(result.data.data));
      }
    } catch (error) {
      console.error("getCakeList Error:", error);
      ShowNotification("error", "An unexpected error occurred");
    } finally{
      setIsApiLoading(false)
    }
  };

  if (is_config_loading || pageLoading) {
    return <LoadingState label="Loading configuration" />;
  }

  if (loadFailed) {
    return <SettingsPageTemplate title="General configuration" subtitle="Company identity and storefront defaults." breadcrumbs={[{label:"Configuration"},{label:"General configuration"}]} sections={[{key:"company",label:"Company details"}]} activeSection="company">
      <EmptyState title="Configuration could not be loaded" description="Check that the API server is running, then try loading the company settings again." action={<SecondaryButton onClick={loadConfiguration}>Try again</SecondaryButton>}/>
    </SettingsPageTemplate>;
  }

  return (
    <SettingsPageTemplate title="General configuration" subtitle="Company identity and storefront defaults." breadcrumbs={[{label:"Configuration"},{label:"General configuration"}]} sections={[{key:"company",label:"Company details"}]} activeSection="company" primaryAction={<PrimaryButton onClick={handleSave}>Save configuration</PrimaryButton>}>
      <FormSection title="Company details">
        <Field label="Company name" required span={6}><TextInput value={companyDetails.name||""} onChange={e=>handleOnchange(e.target.value,"name")}/></Field>
        <Field label="Mobile number" required span={6}><PhoneInput value={companyDetails.mobile||""} onChange={e=>handleOnchange(e.target.value,"mobile")}/></Field>
        <Field label="Email" required span={6}><input type="email" value={companyDetails.email||""} onChange={e=>handleOnchange(e.target.value,"email")}/></Field>
        <Field label="Company website" span={6}><input type="url" value={companyDetails.website||""} onChange={e=>handleOnchange(e.target.value,"website")}/></Field>
        <Field label="GST-IN" span={6}><TextInput value={companyDetails.gst_number||""} onChange={e=>handleOnchange(e.target.value,"gst_number")}/></Field>
        <Field label="Food licence number" span={6}><TextInput value={companyDetails.food_license_number||""} onChange={e=>handleOnchange(e.target.value,"food_license_number")}/></Field>
        <Field label="Company address"><NotesInput rows={3} value={companyDetails.company_address||""} onChange={e=>handleOnchange(e.target.value,"company_address")}/></Field>
      </FormSection>
      <FormSection title="Brand and storefront">
        <Field label="Company logo" span={6}><input type="file" accept="image/*" onChange={e=>handleOnchange(e.target.files[0],"image")}/></Field>{preview&&<div className="mads-field" style={{"--mads-field-span":6}}><img className="mads-thumbnail mads-thumbnail--large" src={preview} alt="Company logo preview"/></div>}
        <Field label="Google Map iframe" span={12}><TextInput value={companyDetails.map_iframe_link||""} onChange={e=>handleOnchange(e.target.value,"map_iframe_link")}/></Field>
        <Field label="Description"><NotesInput rows={4} value={companyDetails.description||""} onChange={e=>handleOnchange(e.target.value,"description")}/></Field>
        <Field label="Return policy"><NotesInput rows={4} value={companyDetails.return_policy||""} onChange={e=>handleOnchange(e.target.value,"return_policy")}/></Field>
        <Field label="Metadata"><NotesInput rows={4} value={companyDetails.meta||""} onChange={e=>handleOnchange(e.target.value,"meta")}/></Field>
      </FormSection>
    </SettingsPageTemplate>
  );
};

export default Config;
