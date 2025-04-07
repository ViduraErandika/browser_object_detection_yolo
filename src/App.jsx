import React, { useState, useEffect, useRef } from "react";
import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-webgl"; // set backend to webgl
import Loader from "./components/loader";
import { Webcam } from "./utils/webcam";
import { renderBoxes } from "./utils/renderBox";
import "./style/App.css";

/**
 * Function to detect image.
 * @param {HTMLCanvasElement} canvasRef canvas reference
 */

function shortenedCol(arrayofarray, indexlist) {
  return arrayofarray.map(function (array) {
      return indexlist.map(function (idx) {
          return array[idx];
      });
  });
}

const App = () => {
  const [loading, setLoading] = useState({ loading: true, progress: 0 });
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const webcam = new Webcam();
  // configs
  const threshold = 0.5;
  /**
   * Function to detect every frame loaded from webcam in video tag.
   * @param {tf.GraphModel} model loaded yolo tensorflow.js model
   */

  const MODEL_URL = '/yolov8_web_model/model.json';
  const CLASS_NAMES = [
    'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck', 'boat',
    'traffic light', 'fire hydrant', 'stop sign', 'parking meter', 'bench', 'bird', 'cat',
    'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe', 'backpack',
    'umbrella', 'handbag', 'tie', 'suitcase', 'frisbee', 'skis', 'snowboard', 'sports ball',
    'kite', 'baseball bat', 'baseball glove', 'skateboard', 'surfboard', 'tennis racket',
    'bottle', 'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple',
    'sandwich', 'orange', 'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake', 'chair',
    'couch', 'potted plant', 'bed', 'dining table', 'toilet', 'tv', 'laptop', 'mouse', 'remote',
    'keyboard', 'cell phone', 'microwave', 'oven', 'toaster', 'sink', 'refrigerator', 'book',
    'clock', 'vase', 'scissors', 'teddy bear', 'hair drier', 'toothbrush'
  ];

  const processOutput = (output) => {
    // Convert tensor to array
    const data = output.arraySync()[0];
    
    const boxes = [];
    const scores = [];
    const classes = [];
    
    const confThreshold = threshold; // Use the same threshold defined at component level
    const iouThreshold = 0.5; // IOU threshold for NMS
    
    // Process each prediction
    for (let i = 0; i < data[0].length; i++) {
      // Find class with maximum probability
      let maxProb = 0;
      let classId = 0;
      for (let j = 4; j < 84; j++) {
        if (data[j][i] > maxProb) {
          maxProb = data[j][i];
          classId = j - 4;
        }
      }
      
      // Filter out low confidence predictions
      if (maxProb > confThreshold) {
        // Extract box coordinates (cx, cy, w, h)
        const cx = data[0][i];
        const cy = data[1][i];
        const w = data[2][i];
        const h = data[3][i];
        
        // Convert to (x1, y1, x2, y2) format
        const x1 = cx - w / 2;
        const y1 = cy - h / 2;
        const x2 = cx + w / 2;
        const y2 = cy + h / 2;
        
        boxes.push([x1, y1, x2, y2]);
        scores.push(maxProb);
        classes.push(classId);
      }
    }
    
    if (boxes.length === 0) {
      return []; // No detections
    }
    
    const boxesTensor = tf.tensor2d(boxes);
    const scoresTensor = tf.tensor1d(scores);
    
    // Apply Non-Maximum Suppression (NMS)
    const nmsIndices = tf.image.nonMaxSuppression(
      boxesTensor,
      scoresTensor,
      10, // max output size
      iouThreshold,
      confThreshold
    );
    
    // Convert to array for processing
    const indices = nmsIndices.arraySync();
    
    // Clean up tensors
    boxesTensor.dispose();
    scoresTensor.dispose();
    nmsIndices.dispose();
    
    // Prepare final detections
    const detections = indices.map(idx => ({
      class: classes[idx],
      score: scores[idx],
      box: boxes[idx]
    }));
    
    return detections;
  };

  const detectFrame = async (model) => {
    const model_dim = [640, 640];
    tf.engine().startScope();
    const input = tf.tidy(() => {
      const img = tf.image
                  .resizeBilinear(tf.browser.fromPixels(videoRef.current), model_dim)
                  .div(255.0)
                  .expandDims(0);
      return img;
    });
    
    try {
      const output = await model.executeAsync(input);
      
      // Process the output
      const detections = processOutput(output);
      
      // Clear the canvas
      const ctx = canvasRef.current.getContext("2d");
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      
      // Render each detection box
      detections.forEach(detection => {
        renderBoxes(
          canvasRef, 
          threshold, 
          [detection.box],
          [detection.score],
          [detection.class],
          CLASS_NAMES
        );
      });
      
      // Dispose of the tensor output
      if (Array.isArray(output)) {
        output.forEach(t => t.dispose());
      } else {
        output.dispose();
      }
    } catch (error) {
      console.error("Error in detection:", error);
    }
    
    requestAnimationFrame(() => detectFrame(model));
    tf.engine().endScope();
  };

  useEffect(() => {
    tf.loadGraphModel(MODEL_URL, {
      onProgress: (fractions) => {
        setLoading({ loading: true, progress: fractions });
      },
    }).then(async (yolo) => {
      // Warmup the model before using real data.
      const dummyInput = tf.ones(yolo.inputs[0].shape);
      await yolo.executeAsync(dummyInput).then((warmupResult) => {
        tf.dispose(warmupResult);
        tf.dispose(dummyInput);

        setLoading({ loading: false, progress: 1 });
        webcam.open(videoRef, () => detectFrame(yolo));
      });
    });
  }, []);
  console.warn = () => {};

  return (
    <div className="App">
      <h2>Object Detection Using yolo & Tensorflow.js</h2>
      {loading.loading ? (
        <Loader>Loading model... {(loading.progress * 100).toFixed(2)}%</Loader>
      ) : (
        <p> </p>
      )}

      <div className="content">
        <video autoPlay playsInline muted ref={videoRef} id="frame"
        />
        <canvas width={640} height={640} ref={canvasRef} />
      </div>
    </div>
  );
};

export default App;
