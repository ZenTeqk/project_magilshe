import React, { useContext, useEffect, useState } from "react";
import { PutApi } from "../../hooks/Post/PutApi";
import { TermsConditionsUrl } from "../../Constant/urls/urls";
import MainContext from "../../context/MainContext";
import { useDispatch } from "react-redux";
import { setTermsReducerData } from "../../redux/reducer/ChildReducer/PolicyReducer";
import { Drawer, Field, PrimaryButton, RichTextEditor, SecondaryButton } from "../../admin/design-system";

const EditTermsConditions = ({ show, setShow, editableData }) => {
  const { ShowNotification } = useContext(MainContext);
  const dispatch = useDispatch();

  const [termsModalValue, setTermsModalValue] = useState("");

  useEffect(() => {
    setTermsModalValue(editableData);
  }, [editableData]);

  const handleSaveTerms = async () => {
    let requestData = { content: termsModalValue };

    try {
      const result = await PutApi(TermsConditionsUrl, requestData);

      if (!result || typeof result.status === "undefined") {
        ShowNotification("error", "Network Error");
      } else if (result.status !== 200) {
        ShowNotification("error", result.data?.message || "An error occurred");
      } else {
        dispatch(setTermsReducerData(result.data?.content));
        ShowNotification("success", "Terms & Conditions updated successfully");
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

  return (
    <Drawer open={show} onClose={handleClose} title="Update Terms & Conditions" footer={<><SecondaryButton onClick={handleClose}>Cancel</SecondaryButton><PrimaryButton onClick={handleSaveTerms}>Save terms</PrimaryButton></>}>
      <Field label="Terms & Conditions" required helperText="Use Heading, • List, 1. List and Indent to structure sections; switch to Preview to check formatting before saving. This content is shown to customers."><RichTextEditor rows={18} value={termsModalValue||""} onChange={setTermsModalValue} ariaLabel="Terms & Conditions content"/></Field>
    </Drawer>
  );
};

export default EditTermsConditions;
