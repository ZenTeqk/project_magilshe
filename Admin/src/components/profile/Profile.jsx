import React, { useContext } from "react";
import MainContext from "../../context/MainContext";
import { DetailPageTemplate } from "../../admin/templates";
import { SectionCard } from "../../admin/design-system";
import { CustomerSummaryPanel } from "../../admin/workflow";

const Profile = () => {
  const { userProfileData } = useContext(MainContext);

//   const pages = [
//     "user-verification",
//     "kit",
//     "order",
//     "whatsapp-query",
//     "food",
//     "meal",
//     "food-intake",
//   ];

  return <DetailPageTemplate title="My profile" subtitle="Your signed-in Admin account details." breadcrumbs={[{label:"Profile"}]}>
    <CustomerSummaryPanel title="Admin account" customer={{name:userProfileData?.name,email:userProfileData?.email,phone:userProfileData?.mobile,role:"Admin"}} fields={[{key:"email",label:"Email"},{key:"phone",label:"Phone"},{key:"role",label:"Role"}]}/>
    <SectionCard title="Account access"><p className="mads-muted">Profile details are managed by the existing authentication system. No editable profile fields are currently exposed by the Admin API.</p></SectionCard>
  </DetailPageTemplate>;
};

export default Profile;
