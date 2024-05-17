import React, { useEffect, useLayoutEffect, useRef, useState} from "react";
import rough from 'roughjs';
import { Drawable } from "roughjs/bin/core";
import { RoughCanvas } from "roughjs/bin/canvas";
import getStroke from "perfect-freehand";
import {ChromePicker} from "react-color";
import "./DrawingComponent.css"

//----------------------------------------------------------------------------------------------------------------------

const generator = rough.generator();

type Coordinates = {x1: number, y1: number, x2: number, y2: number};
type Points = {x: number, y: number}[];

type ShapeElement = {
    id: number;
    coordinates : Coordinates;
    type: "rectangle" | "line" | "circle";
    color: string;
    roughElement: Drawable;
};

type TextElement = {
    id: number;
    textCoordinates : Coordinates;
    type: "text";
    color: string;
    text: string;
};

type PencilElement = {
    id: number;
    points: Points;
    type: "pencil" | "eraser";
    color: string;
    size: number;
};

type Element = PencilElement | ShapeElement | TextElement;

//----------------------------------------------------------------------------------------------------------------------

const createElement = (id: number , x1: number, y1: number, x2: number, y2: number, type: string, color: string): Element => {
    switch(type) {
        case "line":
        case "rectangle":
        case "circle":
            const coordinates = {x1, y1, x2, y2};
            let roughElement;
            if (type === "line") {
                roughElement = generator.line(x1,y1,x2,y2, {stroke: color});
            }else if (type === "rectangle") {
                roughElement = generator.rectangle(x1,y1,x2 - x1, y2 - y1, {stroke: color});
            }else {
                roughElement = generator.circle(x1,y1,Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2), {stroke: color});
            }
            return {id, coordinates, type, roughElement, color};
        case "pencil":
            return {id, type, points: [{x: x1, y: y1}], color, size:24};
        case "eraser":
            return {id, type, points: [{x: x1, y: y1}], color: document.body.style.backgroundColor, size: 24};
        case "text":
            const textCoordinates = {x1, y1, x2, y2};
            return { id, type, textCoordinates, text: "", color};
        default:
            throw new Error('Type not recognised');
    }
};

//----------------------------------------------------------------------------------------------------------------------

const nearPoint = (x: number, y: number, x1: number, y1: number, name: string) => {
    return Math.abs(x - x1) < 5 && Math.abs(y - y1) < 5 ? name : "";
};

const onLine = (x1: number, y1: number, x2: number, y2: number, x: number, y: number, maxDistance = 1) => {
    const a = { x: x1, y: y1 };
    const b = { x: x2, y: y2 };
    const c = { x, y };
    const offset = distance(a, b) - (distance(a, c) + distance(b, c));
    return Math.abs(offset) < maxDistance ? "inside" : null;
};

const positionWithinElement = (x: number, y: number, element: Element) => {
    let x1, y1, x2, y2;

    switch (element.type) {
        case "line":
            ({ x1, y1, x2, y2 } = element.coordinates);
            const on = onLine(x1, y1, x2, y2, x, y);
            const start = nearPoint(x, y, x1, y1, "start");
            const end = nearPoint(x, y, x2, y2, "end");
            return start || end || on;
        case "rectangle":
            ({ x1, y1, x2, y2 } = element.coordinates);
            const topLeft = nearPoint(x, y, x1, y1, "tl");
            const topRight = nearPoint(x, y, x2, y1, "tr");
            const bottomLeft = nearPoint(x, y, x1, y2, "bl");
            const bottomRight = nearPoint(x, y, x2, y2, "br");
            const inside = x >= x1 && x <= x2 && y >= y1 && y <= y2 ? "inside" : null;
            return topLeft || topRight || bottomLeft || bottomRight || inside;
        case "circle":
            const { x1: centerX, y1: centerY } = element.coordinates;
            const radius = Math.sqrt(Math.pow(element.coordinates.x2 - element.coordinates.x1, 2) + Math.pow(element.coordinates.y2 - element.coordinates.y1, 2));
            const distanceToCenter = Math.sqrt(Math.pow(centerX - x, 2) + Math.pow(centerY - y, 2));

            if (distanceToCenter <= radius) {
                return "inside";
            } else if (distanceToCenter <= radius + 5) {
                const angle = Math.atan2(y - centerY, x - centerX);
                const degrees = angle * (180 / Math.PI);

                if (degrees >= -45 && degrees < 45) {
                    return "tr";
                } else if (degrees >= 45 && degrees < 135) {
                    return "tl";
                } else if (degrees >= -135 && degrees < -45) {
                    return "bl";
                } else {
                    return "br";
                }
            } else {
                return null;
            }
        case "pencil":
        case "eraser":
            const betweenAnyPoint = element.points.some((point, index) => {
                const nextPoint = element.points[index + 1];
                if (!nextPoint) return false;
                return onLine(point.x, point.y, nextPoint.x, nextPoint.y, x, y, 5) != null;
            });
            return betweenAnyPoint ? "inside" : null;
        case "text":
            ({ x1, y1, x2, y2 } = element.textCoordinates);
            return x >= x1 && x <= x2 && y >= y1 && y <= y2 ? "inside" : null;
        default:
            throw new Error(`Type not recognised:`);
    }
};

const distance = (a: {x:number, y:number}, b: {x:number, y:number}) => Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));

//----------------------------------------------------------------------------------------------------------------------

const getElementAtPosition = (x: number, y: number, elements: Element[]) => {
    return elements
        .map(element => ({element, position: positionWithinElement(x, y, element)}))
        .find(({ position }) => position !== null);
};


const isShapeElement = (element: Element) => (element.type === "rectangle" || element.type === "line" || element.type === "circle") && element;

const isPencilElement = (element: Element) => (element.type === "pencil" || element.type === "eraser") && element;

//----------------------------------------------------------------------------------------------------------------------

const adjustElementCoordinates = (element: Element) => {
    if(isShapeElement(element)){
        const shapeElement = element as ShapeElement;
        const {type, coordinates} = shapeElement;
        const {x1, y1, x2, y2} = coordinates;

        if(type === "rectangle") {
            const minX = Math.min(x1, x2);
            const maxX = Math.max(x1, x2);
            const minY = Math.min(y1, y2);
            const maxY = Math.max(y1, y2);
            return {x1:minX, y1:minY, x2:maxX, y2:maxY};
        }else {
            if(x1 < x2 || (x1 === x2 && y1 < y2)) {
                return { x1, y1, x2, y2};
            }else {
                return {x1:x2, y1:y2, x2:x1, y2:y1};
            }
        }
    }
};

const cursorForPosition = (position: string) => {
    switch (position) {
        case "tl":
        case "br":
        case "start":
        case "end":
        case "arc":
            return "nwse-resize";
        case "tr":
        case "bl":
            return "nesw-resize";
        default:
            return "move";
    }
};

const resizedCoordinates = (clientX: number, clientY: number, position: string, coordinates: Coordinates) => {
    const { x1, y1, x2, y2 } = coordinates;
    switch (position) {
        case "tl":
        case "start":
        case "arc":
            return { x1: clientX, y1: clientY, x2, y2 };
        case "tr":
            return { x1, y1: clientY, x2: clientX, y2 };
        case "bl":
            return { x1: clientX, y1, x2, y2: clientY };
        case "br":
        case "end":
            return { x1, y1, x2: clientX, y2: clientY };
        default:
            return null;
    }
};

const getSvgPathFromStroke = (stroke: number[][]) => {
    if (!stroke.length) return "";

    const d = stroke.reduce(
        (acc, [x0, y0], i, arr) => {
            const [x1, y1] = arr[(i + 1) % arr.length];
            acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
            return acc;
        },
        ["M", ...stroke[0], "Q"]
    );

    d.push("Z");
    return d.join(" ");
};


//----------------------------------------------------------------------------------------------------------------------
type Action = ((prevState: Element[]) => Element[]) | Element[];

const useHistory = (initialState : Element[]): [Element[], (action: Action, overwrite?: boolean) => void, () => void, () => void] => {
    const [index, setIndex] = useState(0);
    const [history, setHistory] = useState([initialState]);

    const setState = (action : Action, overwrite = false) => {
        const newState = typeof action === "function" ? action(history[index]) : action;

        if(overwrite) {
            const historyCopy = [...history];
            historyCopy[index] = newState;
            setHistory(historyCopy);
        } else {
            const updatedState = [...history].slice(0, index +1);
            setHistory([...updatedState, newState]);
            setIndex(prevState => prevState + 1);
        }
    };

    const undo = () => index > 0 && setIndex(prevState => prevState - 1);
    const redo = () => index < history.length -1 && setIndex(prevState => prevState + 1);

    return [history[index], setState, undo, redo];
};

//----------------------------------------------------------------------------------------------------------------------

const drawElement = (roughCanvas: RoughCanvas, context: CanvasRenderingContext2D, element: Element) => {
    switch (element.type) {
        case "line":
        case "rectangle":
        case "circle" :
            roughCanvas.draw(element.roughElement);
            break;
        case "pencil":
        case "eraser":
            const stroke = getSvgPathFromStroke(getStroke(element.points, {
                size: element.size
            }));
            context.fillStyle = element.color;
            context.fill(new Path2D(stroke));
            break;
        case "text":
            context.textBaseline = "top";
            context.font = "24px sans-serif";
            context.fillStyle = element.color;
            context.fillText(element.text, element.textCoordinates.x1, element.textCoordinates.y1);
            break;
        default:
            throw new Error(`Type not recognised`);
    }
};


const adjustmentRequired = (type: string) => ['line', 'rectangle'].includes(type);

//----------------------------------------------------------------------------------------------------------------------


function DrawingComponent() {

    const canvasRef = useRef<HTMLCanvasElement>(null);

    const [elements, setElements, undo, redo] = useHistory([]);

    const [color, setColor] = useState<string>('#000');

    const [action, setAction] = useState("none");

    const [tool, setTool] = useState("pencil");

    const [selectedElement, setSelectedElement] = useState<any>(null);


    const textAreaRef = useRef<any>();

    const [pencilSize, setPencilSize] = useState<number>(24);

    const [eraserSize, setEraserSize] = useState<number>(24);

    useLayoutEffect( () => {

        const canvas = canvasRef.current!;
        const context = canvas.getContext('2d')!;
        const roughCanvas = rough.canvas(canvas);

        context.clearRect(0, 0, canvas.width, canvas.height);

        context.save();

        document.body.style.backgroundColor = 'pink';

        elements.forEach(element => {
            if (action === "writing" && selectedElement.id === element.id) return;
            drawElement(roughCanvas, context, element)
        })

        context.restore();

    }, [elements, color, action, selectedElement, pencilSize, eraserSize]);


    useEffect(() => {
        const undoRedoFunction = (event: KeyboardEvent) => {
            if((event.metaKey || event.ctrlKey) && event.key === "z") {
                if (event.shiftKey) {
                    redo();
                } else {
                    undo()
                }
            }
        };

        document.addEventListener("keydown", undoRedoFunction);
        return () => {
            document.removeEventListener("keydown", undoRedoFunction);
        }

    }, [undo, redo]);


    // useEffect(() => {
    //     const panFunction = (event: WheelEvent) => {
    //         setPanOffset(prevState => ({
    //             x: prevState.x - event.deltaX,
    //             y: prevState.y - event.deltaY,
    //         }));
    //     };
    //     document.addEventListener("wheel", panFunction);
    //     return () => {
    //         document.removeEventListener("wheel", panFunction);
    //     };
    // }, []);

    useEffect(() => {
        if (textAreaRef.current) {
            const textArea = textAreaRef.current;
            if (action === "writing") {
                setTimeout(() => {
                    textArea.focus();
                    textArea.value = selectedElement.text;
                }, 0);
            }
        }
    }, [action, selectedElement]);


//--------------------------------------------------------------------------------------------------------------------


    const updateElement = (id: number, x1: number, y1: number, x2: number, y2: number, type: string, option?: any) => {
        const elementsCopy = [...elements];
        switch (type) {
            case "line":
            case "rectangle":
            case "circle" :
                elementsCopy[id] = createElement(id, x1, y1, x2, y2, type, color);
                break;
            case "pencil":
                const pencilElement = elementsCopy[id] as PencilElement
                pencilElement.points = [...pencilElement.points, { x: x2, y: y2 }];
                pencilElement.size = pencilSize;
                break;
            case "eraser":
                const eraser = elementsCopy[id] as PencilElement
                eraser.points = [...eraser.points, { x: x2, y: y2 }];
                eraser.size = eraserSize;
                break;
            case "text":
                const canvas = document.getElementById("canvas") as HTMLCanvasElement;
                if (canvas) {
                    const context = canvas.getContext("2d");
                    if (context) {
                        const textWidth = 24
                        const textHeight = 24;
                        elementsCopy[id] = {
                            ...createElement(id, x1, y1, x1 + textWidth, y1 + textHeight, type, color),
                            text: option.text,
                        } as TextElement;
                    }
                }
                break;
            default:
                throw new Error(`Type not recognised`);
        }

        setElements(elementsCopy, true);
    };

    const getMouseCoordinates = (event: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = event.target as HTMLCanvasElement;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const clientX = (event.clientX - rect.left) * scaleX;
        const clientY = (event.clientY - rect.top) * scaleY;
        return { clientX, clientY };
    };

//--------------------------------------------------------------------------------------------------------------------

    const handleMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
        const {clientX, clientY} = getMouseCoordinates(event);

        // if (event.button === 1 || pressedKeys.has(" ")) {
        //     setAction("panning");
        //     setStartPanMousePosition({ x: clientX, y: clientY });
        //     return;
        // }

        if(tool === "selection") {
            const clickedElement = getElementAtPosition(clientX, clientY, elements);
            if(clickedElement?.element && clickedElement.position && clickedElement.element.type !== "eraser") {
                const { element, position } = clickedElement;
                if (element.type === "line" || element.type === "rectangle" || element.type === "circle") {
                    const offsetX = clientX - element.coordinates.x1;
                    const offsetY = clientY - element.coordinates.y1;
                    setSelectedElement({...element, offsetX, offsetY, position: position});
                }
                else if(element.type === "pencil" ) {
                    const xOffsets = element.points.map(point => clientX - point.x);
                    const yOffsets = element.points.map(point => clientY - point.y);
                    setSelectedElement({ ...element, xOffsets, yOffsets });
                }

                setElements(prevState => prevState);

                if(clickedElement.position === "inside") {
                    setAction("moving");
                }else {
                    setAction("resizing");
                }
            }
        }else {
            const id = elements.length;
            const element = createElement(id, clientX, clientY, clientX, clientY, tool, color);
            setElements((prevState) => ([...prevState, element]));
            setSelectedElement(element);
            setAction(tool === "text" ? "writing" : "drawing");
        }
    };

//--------------------------------------------------------------------------------------------------------------------

    const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {

        const {clientX, clientY} = getMouseCoordinates(event);

        // if (action === "panning") {
        //     const deltaX = clientX - startPanMousePosition.x;
        //     const deltaY = clientY - startPanMousePosition.y;
        //     setPanOffset({
        //         x: panOffset.x + deltaX,
        //         y: panOffset.y + deltaY,
        //     });
        //     return;
        // }

        if (tool === "selection") {
            const clickedElement = getElementAtPosition(clientX, clientY, elements);
            const target = event.target as HTMLElement;
            if (clickedElement?.element.type !== "eraser") {
                target.style.cursor = clickedElement
                    ? cursorForPosition(clickedElement.position!)
                    : "default";
            }
        }

        if (action === "drawing") {
            const index = elements.length - 1;
            const element = elements[index];

            if (isShapeElement(element)) {
                const shapeElement = element as ShapeElement;
                const {x1, y1} = shapeElement.coordinates;
                updateElement(index, x1, y1, clientX, clientY, tool);

            }
            else if (isPencilElement(element)) {
                const { points } = element as PencilElement;
                const lastPoint = points[points.length - 1];
                updateElement(index,lastPoint.x, lastPoint.y, clientX, clientY , tool);
            }

        } else if (action === "moving") {

            if (selectedElement.type === "pencil" || selectedElement.type === "eraser") {
                const newPoints = selectedElement.points.map((_: number, index: number) => ({
                    x: clientX - selectedElement.xOffsets[index],
                    y: clientY - selectedElement.yOffsets[index],
                }));
                const elementsCopy = [...elements];
                elementsCopy[selectedElement.id] = {
                    ...selectedElement,
                    points: newPoints,
                };
                setElements(elementsCopy, true);
            } else {

                const {id, coordinates, type, offsetX, offsetY} = selectedElement;
                const width = coordinates.x2 - coordinates.x1;
                const height = coordinates.y2 - coordinates.y1;
                const newX1 = clientX - offsetX;
                const newY1 = clientY - offsetY;

                updateElement(id, newX1, newY1, newX1 + width, newY1 + height, type);
            }

        }else if (action === "resizing") {
            const { id, type, position, coordinates } = selectedElement;
            const { x1, y1, x2, y2 } = resizedCoordinates(clientX, clientY, position, coordinates)!;
            updateElement(id, x1, y1, x2, y2, type);
        }
    };

//----------------------------------------------------------------------------------------------------------------------

    const handleMouseUp = (event: React.MouseEvent<HTMLCanvasElement>) => {
        const { clientX, clientY } = getMouseCoordinates(event);
        if(selectedElement) {
            if (
                selectedElement.type === "text" &&
                clientX - selectedElement.offsetX === selectedElement.x1 &&
                clientY - selectedElement.offsetY === selectedElement.y1
            ) {
                setAction("writing");
                return;
            }

            const index = selectedElement.id;
            const {id, type} = elements[index];
            if((action === "drawing" || action === "resizing") && adjustmentRequired(type)) {
                const {x1, y1, x2, y2} = adjustElementCoordinates(elements[index])!;
                updateElement(id, x1, y1, x2, y2, type);
            }
        }

        if (action === "writing") return;

        setAction("none");
        setSelectedElement(null);
    };

//----------------------------------------------------------------------------------------------------------------------

    const handleToolChange = (newTool: string) => {
        setTool(newTool);

        const canvas = canvasRef.current;
        if (canvas) {
            switch (newTool) {
                case "selection":
                    canvas.style.cursor = "grabbing";
                    break;
                case "line":
                case "rectangle":
                case "circle" :
                case "pencil":
                    canvas.style.cursor = "crosshair";
                    break;
                case "eraser":
                    canvas.style.cursor = 'grabbing';
                    break;
                case "text":
                    canvas.style.cursor = 'text';
                    break;
                default:
                    canvas.style.cursor = "auto";
                    break;
            }
        }
    };

//----------------------------------------------------------------------------------------------------------------------

    const handleBlur = (event: React.FocusEvent<HTMLTextAreaElement>) => {
        const { id, textCoordinates, type } = selectedElement as TextElement;
        setAction("none");
        setSelectedElement(null);
        updateElement(id, textCoordinates.x1, textCoordinates.y1, 0, 0, type, { text: event.target.value });
        setAction("drawing");
    };

//----------------------------------------------------------------------------------------------------------------------

    return (
        <div>
            <div >
                <input
                    type="radio"
                    id="selection"
                    checked={tool === "selection"}
                    onChange={() => handleToolChange("selection")}
                />
                <label htmlFor="Slection">Selection</label>
                <input
                    type="radio"
                    id="line"
                    checked={tool === "line"}
                    onChange={() => handleToolChange("line")}
                />
                <label htmlFor="Line">Line</label>
                <input
                    type="radio"
                    id="rectangle"
                    checked={tool === "rectangle"}
                    onChange={() => handleToolChange("rectangle")}
                />
                <label htmlFor="Rectangle">Rectangle</label>
                <input
                    type="radio"
                    id="circle"
                    checked={tool === "circle"}
                    onChange={() => handleToolChange("circle")}
                />
                <label htmlFor="Circle">Circle</label>
                <input
                    type="radio"
                    id="pencil"
                    checked={tool === "pencil"}
                    onChange={() => handleToolChange("pencil")}
                />
                <label htmlFor="Pencil">Pencil</label>
                {tool === "pencil" ? (<input id="pencilSize" type="range" min="1" max="100" value={pencilSize}
                                             onChange={(event) => setPencilSize(parseInt(event.currentTarget.value))}/>) : null}

                <input
                    type="radio"
                    id="text"
                    checked={tool === "text"}
                    onChange={() => handleToolChange("text")}
                />
                <label htmlFor="text">Text</label>

                <div >
                    <button onClick={undo}>Undo</button>
                    <button onClick={redo}>Redo</button>
                </div>
                {action === "writing" ? (
                    <textarea
                        ref={textAreaRef}
                        onBlur={handleBlur}

                    />
                ) : null}
                <input
                    type="radio"
                    id="eraser"
                    checked={tool === "eraser"}
                    onChange={() => handleToolChange("eraser")}
                />
                <label htmlFor="Eraser">Eraser</label>

                {tool === "eraser" ? (<input id="eraserSize" type="range" min="1" max="100" value={eraserSize}
                                             onChange={(event) => setEraserSize(parseInt(event.currentTarget.value))}/>): null}
                <input
                    type="radio"
                    id="colorPicker"
                    checked={tool === "colorPicker"}
                    onChange={() => setTool("colorPicker")}
                />
                <label htmlFor="ColorPicker">Colors</label>
                {tool === "colorPicker" ? (
                    <ChromePicker color={color} onChange={(event) => {setColor(event.hex);}} />
                ) : null}
            </div>
            <div>
                <canvas
                    ref={canvasRef}
                    id="canvas"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                >
                    Canvas
                </canvas>
            </div>
        </div>

    );
}

export default DrawingComponent;
