import React, { useCallback, useContext, useEffect, useState } from "react";
import { PrivacyPolicyUrl, TermsConditionsUrl } from "../../Constant/urls/urls";
import { useDispatch, useSelector } from "react-redux";
import MainContext from "../../context/MainContext";
import EditTermsConditions from "./EditTerms";
import { GetApi } from "../../hooks/Get/GetApi";
import {
  setPolicyReducerData,
  setTermsReducerData,
} from "../../redux/reducer/ChildReducer/PolicyReducer";
import EditPolicy from "./EditPolicy";
import { LiteMarkdown, PrimaryButton, SecondaryButton, SectionCard } from "../../admin/design-system";
import { DetailPageTemplate } from "../../admin/templates";

const Terms = () => {
  const dispatch = useDispatch();
  const { ShowNotification } = useContext(MainContext);

  const { terms_reducer_data, policy_reducer_data } = useSelector(
    (state) => state.PolicyReducer
  );

  const [isTermsShow, setIsTermsShow] = useState(false);
  const [isPrivacyShow, setIsPrivacyShow] = useState(false);

  const getTermsAndConditions = useCallback(async () => {
    try {
      const result = await GetApi(TermsConditionsUrl);

      if (!result || typeof result.status === "undefined") {
        ShowNotification("error", "Network Error");
      } else if (result.status !== 200) {
        ShowNotification("error", result.data?.message || "An error occurred");
      } else {
        dispatch(setTermsReducerData(result.data?.content));
      }
    } catch (error) {
      console.error("get Items Error:", error);
      ShowNotification("error", "An unexpected error occurred");
    }
  }, [ShowNotification, dispatch]);
  const getPrivacyPolicy = useCallback(async () => {
    try {
      const result = await GetApi(PrivacyPolicyUrl);

      if (!result || typeof result.status === "undefined") {
        ShowNotification("error", "Network Error");
      } else if (result.status !== 200) {
        ShowNotification("error", result.data?.message || "An error occurred");
      } else {
        dispatch(setPolicyReducerData(result.data?.content));
      }
    } catch (error) {
      console.error("get Items Error:", error);
      ShowNotification("error", "An unexpected error occurred");
    }
  }, [ShowNotification, dispatch]);

  useEffect(() => {
    getTermsAndConditions();
    getPrivacyPolicy();
  }, [getPrivacyPolicy, getTermsAndConditions]);

  return (
    <DetailPageTemplate title="Terms and policies" subtitle="Maintain the customer-facing legal content used by MagilShe." breadcrumbs={[{label:"Configuration"},{label:"Terms and policies"}]} primaryAction={<PrimaryButton onClick={()=>setIsTermsShow(true)}>Edit terms</PrimaryButton>} secondaryActions={<SecondaryButton onClick={()=>setIsPrivacyShow(true)}>Edit privacy policy</SecondaryButton>}>
      <div className="mads-management-grid">
        <SectionCard title="Terms & Conditions"><LiteMarkdown text={terms_reducer_data} emptyMessage="No terms have been configured."/></SectionCard>
        <SectionCard title="Privacy Policy"><LiteMarkdown text={policy_reducer_data} emptyMessage="No privacy policy has been configured."/></SectionCard>
      </div>

      <EditTermsConditions
        show={isTermsShow}
        setShow={setIsTermsShow}
        editableData={terms_reducer_data}
      />
      <EditPolicy
        show={isPrivacyShow}
        setShow={setIsPrivacyShow}
        editableData={policy_reducer_data}
      />
    </DetailPageTemplate>
  );
};

export default Terms;
