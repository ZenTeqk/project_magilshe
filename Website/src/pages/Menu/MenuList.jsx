import React, { useContext, useEffect, useState } from "react";
import Search from "../../assets/icons/search.png";
import Popularity from "../../assets/icons/popularity.png";
import NoDataFound from "../../assets/images/no-data-found.gif";
import {
  FormControl,
  Grid,
  InputAdornment,
  MenuItem,
  Select,
  Skeleton,
  TextField,
} from "@mui/material";
import CakeOfferCard from "../../component/common/Category/CakeOfferCard";
import CategoryButton from "./CategoryButton";
import "./MenuList.scss";
import { DataContext } from "../../context/DataContext";
import { getOverallCakeMenuList } from "../../utils/cakeryAPI";

const MenuList = () => {
  const {
    setIsPreloaderShow,
    mainCategoriesObj,
    subCategoriesObj,
    menuListObj,
    setMenuListObj,
    initPageMenuList,
    setInitPageMenuList,
    selectedCategory, setSelectedCategory,
    selectedMainCategory, setSelectedMainCategory,
    formatedCategory, setFormatedCategory
  } = useContext(DataContext);


  // const [formatedCategory, setFormatedCategory] = useState([]);

  const [filteredMenuList, setFilteredMenuList] = useState([]);

  const [isCakeApiLoading, setIsCakeApiLoading] = useState(false);

  // useEffect(() => {
  //   const mainCategoryFormatted = mainCategoriesObj?.map((mainCat) => {
  //     const subCategories = subCategoriesObj?.filter(
  //       (subCat) => subCat?.main_category?.id === mainCat?.id
  //     );

  //     return {
  //       ...mainCat,
  //       subcategories: subCategories,
  //     };
  //   });

  //   setFormatedCategory(mainCategoryFormatted);
  // }, [subCategoriesObj]);

  function findSubcategoryDetails(subcategoryName) {
    for (const category of formatedCategory) {
      for (const subcategory of category.subcategories) {
        if (subcategory.name === subcategoryName) {
          return {
            subcategoryName: subcategory.name,
            mainCategoryName: category.name,
          };
        }
      }
    }
    return null;
  }

  useEffect(() => {
    if (selectedCategory) {
      let filterValue = findSubcategoryDetails(selectedCategory)

      setSelectedMainCategory(filterValue?.mainCategoryName);
      setSelectedCategory(filterValue?.subcategoryName)
    }
  }, []);

  useEffect(() => {
    if (initPageMenuList) {
      getCakeList();
      setInitPageMenuList(false);
    }
  }, []);

  const getCakeList = async () => {
    setIsCakeApiLoading(true)
    try {
      const getCakeAPIResponse = await getOverallCakeMenuList();
      setMenuListObj(getCakeAPIResponse?.data);
      setFilteredMenuList(getCakeAPIResponse?.data)
    } catch (error) {
      console.error(error);
    } finally {
      setIsCakeApiLoading(false)
    }
  };

  const handleMainCategoryClick = (category) => {
    setSelectedMainCategory(category === selectedMainCategory ? null : category);
    setSelectedCategory(category);
  };


  const handleSubCategoryClick = (subCategoryName) => {
    setSelectedCategory(subCategoryName);
  };

  const [menuSearch, setMenuSearch] = useState("");

  useEffect(() => {

    let selectcedCategoryFilter = selectedCategory || "All"
    const filterList = menuListObj.filter((cake) => {

      const matchesCategory =
        selectcedCategoryFilter === "All" ||
        cake?.sub_category?.name === selectcedCategoryFilter ||
        cake?.main_category?.name === selectcedCategoryFilter;

      const matchesSearch =
        !menuSearch || cake?.name.toLowerCase().includes(menuSearch.toLowerCase());

      return matchesCategory && matchesSearch;
    });

    setFilteredMenuList(filterList);
  }, [selectedCategory, menuSearch]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);


  return (
    <div className="bg-gradient">
      <Grid container spacing={2}>
        <Grid item md={3} sm={3} xs={12}>
          <div>
            <div className="rounded overflow-hidden shadow-lg p-3">
              <h2 className="font-poppins font-semibold text-sm">Filters</h2>
              <div className="py-4 relative">
                <TextField
                  placeholder="Search Cakes"
                  variant="outlined"
                  size="small"
                  className="text-xs rounded-md border-[1.4px] border-solid border-solid border-Layout-300 bg-Layout-100"
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <img src={Search} height={16} width={16} />
                      </InputAdornment>
                    ),
                  }}
                  onChange={(e) => {
                    setMenuSearch(e.target?.value);
                  }}
                  fullWidth
                />
              </div>
              {/* <FormControl variant="outlined" fullWidth size="small" style={{ display: "none" }}>
                <Select
                  placeholder="Popularity"
                  endAdornment={
                    <InputAdornment position="end">
                      <img src={Popularity} height={16} width={16} />
                    </InputAdornment>
                  }
                >
                  <MenuItem value={"ASC"}>Low to High</MenuItem>
                  <MenuItem value={"DESC"}>High to Low</MenuItem>
                </Select>
              </FormControl> */}
            </div>

            <div className="rounded overflow-hidden shadow-lg p-3 mt-8">
              <h2 className="font-poppins font-semibold text-sm">Categories</h2>
              <div className="py-2">
                <CategoryButton
                  name="All"
                  key={1000}
                  is_sub={false}
                  selectedCategory={selectedCategory}
                  handleSelect={() => handleMainCategoryClick("All")}
                />
                {formatedCategory?.map((category, index) => (
                  <div key={index}>
                    <CategoryButton
                      name={category.name}
                      isSub={false}
                      selectedCategory={selectedCategory}
                      handleSelect={() =>
                        handleMainCategoryClick(category.name)
                      }
                    />
                    <div className="flex flex-wrap">
                      {selectedMainCategory === category.name &&
                        category?.subcategories?.map((sub, subIndex) => (
                          <CategoryButton
                            name={sub.name}
                            isSub={true}
                            key={"1" + subIndex}
                            selectedCategory={selectedCategory}
                            handleSelect={() => handleSubCategoryClick(sub.name)}
                          />
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Grid>

        <Grid item md={9} sm={9} xs={12}>
          <Grid container spacing={2}>
            {!isCakeApiLoading ? (
              filteredMenuList.length ? (
                filteredMenuList.map((data, index) => (
                  <CakeOfferCard
                    key={index}
                    column={3}
                    image={data?.images?.[0]?.url}
                    discount={data?.price_list?.[0]?.offer_percentage?.[0]}
                    title={data?.name}
                    originalPrice={data?.price_list?.[0]?.price}
                    discountPrice={
                      data?.price_list?.[0]?.cake_price_after_offer
                    }
                    id={data?.id}
                    cakeData={data}
                  />
                ))
              ) : (
                <div className="no-cake-found">
                  <p>
                    No delicious cakes here for now. Please explore other
                    options
                  </p>
                  <img src={NoDataFound} alt="" />
                </div>
              )
            ) : (
              Array.from({ length: 8 }).map((_, index) => (
                <Grid item key={index} md={3} sm={6} xs={6}>
                  <Skeleton
                    variant="rounded"
                    animation="wave"
                    height={"325px"}
                    width={"100%"}
                  />
                </Grid>
              ))
            )}
          </Grid>
        </Grid>
      </Grid>
    </div>
  );
};

export default MenuList;
