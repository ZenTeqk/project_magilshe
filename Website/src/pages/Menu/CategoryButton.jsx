// import React from "react";
import PropTypes from "prop-types";
import classNames from "classnames";

const CategoryButton = ({ key, name, handleSelect, selectedCategory, isSub }) => {
  return (
    <div key={key} className={`mt-2 ${isSub && "ml-3 sub-category-button"}`} style={{cursor: "pointer"}} onClick={() => {
      handleSelect(name)
    }}>
      <div
        className={classNames(
          "flex py-[16px] px-[12px] gap-[14px] self-stretch rounded-lg",
          {
            "gradient-base-theme-button":
              selectedCategory === name,
            "bg-slate-50": selectedCategory !== name,
          }
        )}
      >
        <button
          className={classNames(
            "rounded  text-start font-poppins text-[12px] font-semibold leading-normal",
            {
              "text-Primary-White": selectedCategory === name,
            }
          )}
          name={name}
        >
          {isSub && "" }{name}
        </button>
      </div>
    </div>
  );
};

export default CategoryButton;

CategoryButton.propTypes = {
  key: PropTypes.string,
  name: PropTypes.string,
  isSub: PropTypes.boolean,
  selectedCategory: PropTypes.string,
  handleSelect: PropTypes.func,
};
