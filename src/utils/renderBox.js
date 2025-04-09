function xywh2xyxy(x){
  //Convert boxes from [x, y, w, h] to [x1, y1, x2, y2] where xy1=top-left, xy2=bottom-right
  var y = [];
  y[0] = x[0] - x[2] / 2  //top left x
  y[1] = x[1] - x[3] / 2  //top left y
  y[2] = x[0] + x[2] / 2  //bottom right x
  y[3] = x[1] + x[3] / 2  //bottom right y
  return y;
}

// export const renderBoxes = (canvasRef, threshold, boxes_data, scores_data, classes_data, class_names) => {
//   const ctx = canvasRef.current.getContext("2d");
  
//   // font configs
//   const font = "18px sans-serif";
//   ctx.font = font;
//   ctx.textBaseline = "top";

//   for (let i = 0; i < scores_data.length; ++i) {
//     if (scores_data[i] > threshold) {
//       const klass = class_names[classes_data[i]];
//       const score = (scores_data[i] * 100).toFixed(1);

//       // boxes_data[i] is already in [x1, y1, x2, y2] format from processOutput
//       const [x1, y1, x2, y2] = boxes_data[i];
      
//       const width = x2 - x1;
//       const height = y2 - y1;

//       // Draw the bounding box.
//       ctx.strokeStyle = "#B033FF";
//       ctx.lineWidth = 2;
//       ctx.strokeRect(x1, y1, width, height);

//       // Draw the label background.
//       ctx.fillStyle = "#B033FF";
//       const textWidth = ctx.measureText(klass + " - " + score + "%").width;
//       const textHeight = parseInt(font, 10); // base 10
//       ctx.fillRect(x1 - 1, y1 - (textHeight + 2), textWidth + 2, textHeight + 2);

//       // Draw labels
//       ctx.fillStyle = "#ffffff";
//       ctx.fillText(klass, x1 - 1, y1 - (textHeight + 2));
//     }
//   }
// };

export const renderBoxes = (canvasRef, threshold, boxes_data, scores_data, classes_data, class_names) => {
  const ctx = canvasRef.current.getContext("2d");

  const font = "16px Poppins";
  ctx.font = font;
  ctx.textBaseline = "top";

  const colors = [
    "#B033FF", "#33C1FF", "#FF9933", "#33FF57",
    "#FF33A8", "#FFD633", "#33FFEB", "#FF5733"
  ];

  const drawRoundedRect = (x, y, width, height, radius, stroke, fill) => {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();

    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  };

  const drawDot = (x, y, color) => {
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
  };

  const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1);

  for (let i = 0; i < scores_data.length; ++i) {
    if (scores_data[i] > threshold) {
      const klass = capitalize(class_names[classes_data[i]]);
      const color = colors[classes_data[i] % colors.length];

      const [x1, y1, x2, y2] = boxes_data[i];
      const width = x2 - x1;
      const height = y2 - y1;

      // Draw bounding box
      drawRoundedRect(x1, y1, width, height, 15, color, null);

      // Label dimensions
      const textWidth = ctx.measureText(klass).width;
      const textHeight = parseInt(font, 10);
      const padding = 8;
      const labelWidth = textWidth + padding * 2;
      const labelHeight = textHeight + padding;

      const labelX = x1 + width / 2 - labelWidth / 2;
      const labelY = y1 - labelHeight - 18;

      const centerX = x1 + width / 2;
      const topBoxY = y1;
      const bottomLabelY = labelY + labelHeight;

      // Draw connection line
      ctx.beginPath();
      ctx.moveTo(centerX, topBoxY);
      ctx.lineTo(centerX, bottomLabelY);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Dots at both ends
      drawDot(centerX, topBoxY, color);
      drawDot(centerX, bottomLabelY, color);

      // Draw label background
      drawRoundedRect(labelX, labelY, labelWidth, labelHeight, 10, null, color);

      // Draw label text centered
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.fillText(klass, x1 + width / 2, labelY + padding / 2);
      ctx.textAlign = "start"; // reset to default
    }
  }
};
