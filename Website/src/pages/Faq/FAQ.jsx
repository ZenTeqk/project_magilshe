import React, { useState } from "react";
import { FiChevronDown } from "react-icons/fi";

const faqData = [
    {
        question: "Are your cakes 100% pure veg?",
        answer:
            "Yes, all our cakes are 100% pure veg and prepared using vegetarian ingredients only. We maintain high quality standards to ensure every cake is fresh, delicious, and completely vegetarian.",
    },
    {
        question: "Do you make eggless cakes only?",
        answer:
            "Yes, we specialize in eggless cakes. Every cake we bake is completely eggless, making it perfect for customers looking for pure veg cake options for birthdays, anniversaries, and celebrations.",
    },
    {
        question: "Are your cakes freshly baked every day?",
        answer:
            "Absolutely! Our cakes are freshly baked every day to ensure the best taste, softness, and quality. We believe fresh cakes make every celebration extra special.",
    },
    {
        question: "Can I order custom birthday cakes?",
        answer:
            "Yes, we offer custom birthday cakes based on your preferred theme, flavour, size, and design. You can contact us to discuss your requirements and we’ll create a cake just for your occasion.",
    },
    {
        question: "Do you offer same-day cake delivery?",
        answer:
            "Yes, same-day cake delivery is available for selected cakes and locations, subject to order timing and availability. Please contact us early for faster confirmation.",
    },
    {
        question: "What cake sizes are available?",
        answer:
            "We offer cakes in multiple sizes such as 500g, 1kg, 1.5kg, 2kg, and custom sizes depending on the design and occasion. Availability may vary by cake type.",
    },
    {
        question: "Can I customize the cake flavour and design?",
        answer:
            "Yes, you can customize both the flavour and design of your cake. We offer popular flavours like Black Forest, Chocolate Truffle, Butterscotch, Red Velvet, Vanilla, and more.",
    },
    {
        question: "Do you provide midnight cake delivery?",
        answer:
            "Midnight cake delivery may be available in selected areas based on location and order timing. Please contact us in advance to check availability and charges.",
    },
    {
        question: "How should I store the cake after delivery?",
        answer:
            "Store cream cakes in the refrigerator and keep them away from direct heat. It is best to consume the cake within 24 hours for the freshest taste and texture.",
    },
    {
        question: "How early should I place my cake order?",
        answer:
            "For regular cakes, ordering a few hours in advance is recommended. For custom cakes, theme cakes, or large orders, we suggest placing your order at least 1–2 days in advance.",
    },
];

const FAQ = () => {
    const [openIndex, setOpenIndex] = useState(0);

    const toggleFaq = (index) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    return (
        <section className="w-full py-10 px-4 md:px-8 bg-white">
            <div className="max-w-4xl mx-auto">
                <div className="mb-6 text-center">
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                        Frequently Asked Questions
                    </h2>
                    <p className="text-sm md:text-base text-gray-600 mt-2">
                        Pure veg & eggless cakes for every celebration 🎂
                    </p>
                </div>

                <div className="space-y-3">
                    {faqData.map((faq, index) => {
                        const isOpen = openIndex === index;

                        return (
                            <div
                                key={index}
                                className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm"
                            >
                                <button
                                    onClick={() => toggleFaq(index)}
                                    className="w-full flex items-center justify-between text-left px-5 py-4 bg-white hover:bg-gray-50 transition"
                                >
                                    <span className="text-sm md:text-base font-semibold text-gray-800 pr-4">
                                        {faq.question}
                                    </span>

                                    <FiChevronDown
                                        className={`text-xl text-gray-500 transition-transform duration-300 ${isOpen ? "rotate-180" : ""
                                            }`}
                                    />
                                </button>

                                <div
                                    className={`grid transition-all duration-300 ease-in-out ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                                        }`}
                                >
                                    <div className="overflow-hidden">
                                        <div className="px-5 pb-4 text-sm md:text-base text-gray-600 leading-7">
                                            {faq.answer}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};

export default FAQ;