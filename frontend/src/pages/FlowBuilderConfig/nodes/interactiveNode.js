import {
  ArrowForwardIos,
  ContentCopy,
  Delete,
  FormatListBulleted,
  LinkOff,
  TouchApp,
} from "@mui/icons-material";
import React, { memo } from "react";

import { Handle } from "react-flow-renderer";
import { useNodeStorage } from "../../../stores/useNodeStorage";

export default memo(({ data, isConnectable, id }) => {
  const storageItems = useNodeStorage();
  const isButton = true;
  const color = "#388E3C";
  const label = "Botões";

  return (
    <div
      style={{
        backgroundColor: "#FAFBFF",
        padding: "8px",
        borderRadius: "8px",
        maxWidth: "200px",
        boxShadow: "0px 3px 5px rgba(0,0,0,.05)",
        border: `1px solid ${color}40`,
        width: 200,
      }}
    >
      <Handle
        type="target"
        position="left"
        style={{
          background: color,
          width: "18px",
          height: "18px",
          top: "20px",
          left: "-12px",
          cursor: "pointer",
        }}
        onConnect={(params) => console.log("handle onConnect", params)}
        isConnectable={isConnectable}
      >
        <ArrowForwardIos
          sx={{
            color: "#ffff",
            width: "10px",
            height: "10px",
            marginLeft: "2.9px",
            marginBottom: "1px",
            pointerEvents: "none",
          }}
        />
      </Handle>
      <div
        style={{
          display: "flex",
          position: "absolute",
          right: 5,
          top: 5,
          cursor: "pointer",
          gap: 6,
        }}
      >
        <ContentCopy
          onClick={() => {
            storageItems.setNodesStorage(id);
            storageItems.setAct("duplicate");
          }}
          sx={{ width: "12px", height: "12px", color }}
        />
        <LinkOff
          onClick={() => {
            storageItems.setNodesStorage(id);
            storageItems.setAct("disconnect");
          }}
          sx={{ width: "12px", height: "12px", color }}
        />
        <Delete
          onClick={() => {
            storageItems.setNodesStorage(id);
            storageItems.setAct("delete");
          }}
          sx={{ width: "12px", height: "12px", color }}
        />
      </div>

      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          marginBottom: "4px",
        }}
      >
        <TouchApp
          sx={{
            width: "16px",
            height: "16px",
            marginRight: "4px",
            color: "#9C27B0",
          }}
        />
        <div style={{ color: "#232323", fontSize: "13px", fontWeight: 600 }}>
          Msg Interativa API
        </div>
      </div>
      <div
        style={{
          fontSize: "10px",
          color: "#888",
          marginBottom: "6px",
        }}
      >
        {`${label} (máx. 3)`}
      </div>

      {/* Header image */}
      {data.headerImage && (
        <img
          src={process.env.REACT_APP_BACKEND_URL + '/public/' + data.headerImage}
          alt="Header"
          style={{
            width: "100%",
            height: "50px",
            objectFit: "cover",
            borderRadius: "4px",
            marginBottom: "4px",
          }}
          onError={(e) => { e.target.style.display = "none"; }}
        />
      )}

      {/* Body preview */}
      <div
        style={{
          color: "#232323",
          fontSize: "11px",
          height: "36px",
          overflow: "hidden",
          marginBottom: "6px",
          backgroundColor: "#f0f0f0",
          borderRadius: "4px",
          padding: "4px 6px",
        }}
      >
        {data.message || "Corpo da mensagem..."}
      </div>

      {/* Button type: stacked buttons */}
      {isButton &&
        data.arrayOption &&
        data.arrayOption.slice(0, 3).map((option) => (
          <div
            key={option.number}
            style={{
              display: "flex",
              alignItems: "center",
              position: "relative",
            }}
          >
            <div
              style={{
                borderTop: "1px solid #e0e0e0",
                padding: "5px 4px",
                fontSize: "10px",
                textAlign: "center",
                color: "#00a5f4",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                width: "100%",
                fontWeight: 600,
              }}
            >
              {option.value || `Botão ${option.number}`}
            </div>
            <Handle
              type="source"
              position="right"
              id={"a" + option.number}
              style={{
                top: "auto",
                position: "relative",
                background: color,
                width: "16px",
                height: "16px",
                right: "-3px",
                cursor: "pointer",
                flexShrink: 0,
              }}
              isConnectable={isConnectable}
            >
              <ArrowForwardIos
                sx={{
                  color: "#fff",
                  width: "8px",
                  height: "8px",
                  marginLeft: "3px",
                  marginBottom: "1px",
                  pointerEvents: "none",
                }}
              />
            </Handle>
          </div>
        ))}

      {/* List type: each item with its own handle */}
      {!isButton && (
        <div>
          <div
            style={{
              borderTop: "1px solid #e0e0e0",
              padding: "5px 8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
            }}
          >
            <FormatListBulleted
              sx={{ width: "13px", height: "13px", color: "#00a5f4" }}
            />
            <span
              style={{
                color: "#00a5f4",
                fontSize: "11px",
                fontWeight: 600,
              }}
            >
              {data.listButtonText || "Selecionar"}
            </span>
          </div>
          {data.arrayOption &&
            data.arrayOption.map((option) => (
              <div
                key={option.number}
                style={{
                  display: "flex",
                  alignItems: "center",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    borderTop: "1px solid #e0e0e0",
                    padding: "5px 4px",
                    fontSize: "10px",
                    textAlign: "center",
                    color: "#1976D2",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    width: "100%",
                    fontWeight: 600,
                  }}
                >
                  {option.value || `Item ${option.number}`}
                </div>
                <Handle
                  type="source"
                  position="right"
                  id={"a" + option.number}
                  style={{
                    top: "auto",
                    position: "relative",
                    background: color,
                    width: "16px",
                    height: "16px",
                    right: "-3px",
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                  isConnectable={isConnectable}
                >
                  <ArrowForwardIos
                    sx={{
                      color: "#fff",
                      width: "8px",
                      height: "8px",
                      marginLeft: "3px",
                      marginBottom: "1px",
                      pointerEvents: "none",
                    }}
                  />
                </Handle>
              </div>
            ))}
        </div>
      )}
    </div>
  );
});
