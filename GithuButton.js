// ==UserScript==
// @name         GithuButton
// @namespace    https://raw.githubusercontent.com/Yu9191/Rewrite/main/Github_Open_Raw.js
// @version      2.8
// @description  在Github页面增加Raw以及ScrioHub一键转换按钮
// @author       自用
// @match        https://github.com/*
// ==/UserScript==

(function () {
  "use strict";
  setTimeout(function () {
    const isBlobPage = window.location.pathname.includes("/blob/");
    if (document.readyState === "complete" ||(document.readyState !== "loading" && isBlobPage)) {
      init();
    } else { document.addEventListener("DOMContentLoaded", function () {
        init();
      });
    };

    function init() {
      if (isBlobPage) {
        // 添加Raw按钮
        const rawButton = createButton("Raw", openRawLink);
        document.body.appendChild(rawButton);
        // 添加QX→Surge按钮
        const scriptHubButton = createButton(
          "QX脚本→Surge",
          openScriptHubLink
        );
        document.body.appendChild(scriptHubButton);

        // 添加QX→Loon按钮
        const firstButton = createButton(
           "QX脚本→Loon", 
           firstButtonClickHandler
        );
        document.body.appendChild(firstButton);

        // 添加QX规则集→Surge按钮
        const secondButton = createButton(
           "QX规则集→Surge", 
           secondButtonClickHandler
        );
        document.body.appendChild(secondButton);
      }
    }

    function createButton(text, clickHandler) {
      const button = document.createElement("button");
      button.innerHTML = text;
      button.style.position = "fixed";
      button.style.backgroundColor = "#30303355";
      button.style.color = "#eeeeee";
      button.style.border = "none";
      button.style.padding = "8px 16px";
      button.style.borderRadius = "16px";
      button.style.cursor = "pointer";

      // 将 Raw 按钮放在右侧
      if (text === "Raw") {
        button.style.right = "20px";
        button.style.bottom = "50px"; 
      }

      // 将 QX→Surge 按钮放在左侧
      if (text === "QX脚本→Surge") {
        button.style.left = "20px";
        button.style.bottom = "50px"; 
      }

      // 将 QX→Loon 按钮放在左侧
      if (text === "QX脚本→Loon") {
        button.style.left = "20px";
        button.style.bottom = "100px"; 
      }

      // 将 QX规则集→Surge 按钮放在左侧
      if (text === "QX规则集→Surge") {
        button.style.left = "20px";
        button.style.bottom = "150px"; 
      }

      button.addEventListener("click", clickHandler);
      return button;
    }

    function openRawLink() {
        // 提取
        const rawUrl = window.location.href.replace("/blob", "").replace("github.com", "raw.githubusercontent.com");
        window.open(rawUrl, "_blank");
    }
    // QX→Surge的点击处理函数
    function openScriptHubLink() {
        const rawUrl = window.location.href
        .replace("/blob", "")
        .replace("github.com", "raw.githubusercontent.com");
        const scriptHubUrl = `http://192.168.99.2:9101/file/_start_/${rawUrl}/_end_/plain.txt?type=qx-rewrite&target=surge-module`;
        window.open(scriptHubUrl, "_blank");
    }

    // QX→Loon的点击处理函数
    function firstButtonClickHandler() {
        // 在这里添加你的代码
        const rawUrl = window.location.href
        .replace("/blob", "")
        .replace("github.com", "raw.githubusercontent.com");
        // 生成 ScriptHub 链接
        const scriptHubUrl = `http://192.168.99.2:9101/file/_start_/${rawUrl}/_end_/plain.txt?type=qx-rewrite&target=loon-plugin`;
        window.open(scriptHubUrl, "_blank");
    }

    // QX规则集→Surge的点击处理函数
    function secondButtonClickHandler() {
        // 在这里添加你的代码
        const rawUrl = window.location.href
        .replace("/blob", "")
        .replace("github.com", "raw.githubusercontent.com");
        // 生成 ScriptHub 链接
        const scriptHubUrl = `http://192.168.99.2:9101/file/_start_/${rawUrl}/_end_/plain.txt?type=rule-set&target=surge-rule-set`;
        window.open(scriptHubUrl, "_blank");
    }
  }, 600);
})();
