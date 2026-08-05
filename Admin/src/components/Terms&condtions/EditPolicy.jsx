import React, { useContext, useEffect, useState } from "react";
import { PutApi } from "../../hooks/Post/PutApi";
import { PrivacyPolicyUrl } from "../../Constant/urls/urls";
import MainContext from "../../context/MainContext";
import { useDispatch } from "react-redux";
import { setPolicyReducerData } from "../../redux/reducer/ChildReducer/PolicyReducer";
import { Drawer, Field, PrimaryButton, RichTextEditor, SecondaryButton } from "../../admin/design-system";

const EditPolicy = ({ show, setShow, editableData }) => {
  const { ShowNotification } = useContext(MainContext);
  const dispatch = useDispatch();

  const [policyValue, setPolicyValue] = useState("");

  useEffect(() => {
    setPolicyValue(editableData);
  }, [editableData]);

  const handleSavePolicy = async () => {
    let requestData = { content: policyValue };

    try {
      const result = await PutApi(PrivacyPolicyUrl, requestData);

      if (!result || typeof result.status === "undefined") {
        ShowNotification("error", "Network Error");
      } else if (result.status !== 200) {
        ShowNotification("error", result.data?.message || "An error occurred");
      } else {
        dispatch(setPolicyReducerData(result.data?.content));
        ShowNotification("success", "Privacy Policy updated successfully");
        setShow(false);
      }
    } catch (error) {
      ShowNotification("error", "An unexpected error occurred");
    } finally {
      //   dispatch(setIsTagLoadingReducerData(false)); // End loading
    }
  };

  const handleClose = () => {
    setShow(false);
  };

  return <Drawer open={show} onClose={handleClose} title="Update Privacy Policy" footer={<><SecondaryButton onClick={handleClose}>Cancel</SecondaryButton><PrimaryButton onClick={handleSavePolicy}>Save policy</PrimaryButton></>}>
    <Field label="Privacy Policy" required helperText="Use Heading, • List, 1. List and Indent to structure sections; switch to Preview to check formatting before saving. This content is shown to customers."><RichTextEditor rows={18} value={policyValue||""} onChange={setPolicyValue} ariaLabel="Privacy Policy content"/></Field>
  </Drawer>;
};

export default EditPolicy;
