import React, {useEffect, useLayoutEffect, useRef, useState} from "react";
import rough from 'roughjs';
import {Drawable} from "roughjs/bin/core";
import {RoughCanvas} from "roughjs/bin/canvas";
import getStroke from "perfect-freehand";
import {ChromePicker} from "react-color";
import "./DrawingComponent.css"

//----------------------------------------------------------------------------------------------------------------------

const generator = rough.generator();

type Coordinates = { x1: number, y1: number, x2: number, y2: number };
type Point = { x: number, y: number };

// type ShapeElement = {
//     index: number;
//     id: number;
//     type: "rectangle" | "line" | "circle";
//     color: string;
//     coordinates: Coordinates;
//     roughElement?: Drawable;
//
//     points?: undefined
//     size?: undefined;
//     text?: undefined;
// };
//
// type TextElement = {
//     index: number;
//     id: number;
//     type: "text";
//     color: string;
//     coordinates: Coordinates;
//     text?: string;
//
//     roughElement?: undefined;
//     points?: undefined;
//     size?: undefined;
// };
//
// type PencilElement = {
//     index: number;
//     id: number;
//     type: "pencil" | "eraser";
//     color: string;
//     points: Point[];
//     size: number;
//
//     roughElement?: undefined;
//     coordinates?: undefined;
//     text?: undefined;
// };
//
// type Element = PencilElement | ShapeElement | TextElement;


type DrawingElement = {
    index: number;
    id: number;
    type: "rectangle" | "line" | "circle" | "text" | "pencil" | "eraser";
    color: string;
    coordinates?: Coordinates,
    points?: Point[],
    size?: number;
    text?: string;
    roughElement?: Drawable;
}

enum ActionType {
    DRAW, UNDO, UPDATE
}

export type DrawingAction = {
    index?: number,
    type: ActionType,
    elementId?: number,
    element?: DrawingElement,
    coordinates?: Coordinates,
    points?: Point[]
}

//----------------------------------------------------------------------------------------------------------------------


//----------------------------------------------------------------------------------------------------------------------

const nearPoint = (x: number, y: number, x1: number, y1: number, name: string) => {
    return Math.abs(x - x1) < 5 && Math.abs(y - y1) < 5 ? name : "";
};

const onLine = (x1: number, y1: number, x2: number, y2: number, x: number, y: number, maxDistance = 1) => {
    const a = {x: x1, y: y1};
    const b = {x: x2, y: y2};
    const c = {x, y};
    const offset = distance(a, b) - (distance(a, c) + distance(b, c));
    return Math.abs(offset) < maxDistance ? "inside" : null;
};

const positionWithinElement = (x: number, y: number, element: DrawingElement) => {
    let x1, y1, x2, y2;

    switch (element.type) {
        case "line":
            if (!element.coordinates) return;
            ({x1, y1, x2, y2} = element.coordinates);
            const on = onLine(x1, y1, x2, y2, x, y);
            const start = nearPoint(x, y, x1, y1, "start");
            const end = nearPoint(x, y, x2, y2, "end");
            return start || end || on;
        case "rectangle":
            if (!element.coordinates) return;
            ({x1, y1, x2, y2} = element.coordinates);
            const topLeft = nearPoint(x, y, x1, y1, "tl");
            const topRight = nearPoint(x, y, x2, y1, "tr");
            const bottomLeft = nearPoint(x, y, x1, y2, "bl");
            const bottomRight = nearPoint(x, y, x2, y2, "br");
            const inside = x >= x1 && x <= x2 && y >= y1 && y <= y2 ? "inside" : null;
            return topLeft || topRight || bottomLeft || bottomRight || inside;
        case "circle":
            if (!element.coordinates) return;
            const {x1: centerX, y1: centerY} = element.coordinates;
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
            if (!element.points) return;
            const betweenAnyPoint = element.points.some((point, index) => {
                if (!element.points) return;
                const nextPoint = element.points[index + 1];
                if (!nextPoint) return false;
                return onLine(point.x, point.y, nextPoint.x, nextPoint.y, x, y, 5) != null;
            });
            return betweenAnyPoint ? "inside" : null;
        case "text":
            if (!element.coordinates) return;
            ({x1, y1, x2, y2} = element.coordinates);
            return x >= x1 && x <= x2 && y >= y1 && y <= y2 ? "inside" : null;
        default:
            throw new Error(`Type not recognised:`);
    }
};

const distance = (a: { x: number, y: number }, b: {
    x: number,
    y: number
}) => Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));

//----------------------------------------------------------------------------------------------------------------------

const getElementAtPosition = (x: number, y: number, elements: DrawingElement[]) => {
    return elements
        .map(element => ({element, position: positionWithinElement(x, y, element)}))
        .find(({position}) => position !== null);
};


const isShapeElement = (element: DrawingElement) => (element.type === "rectangle" || element.type === "line" || element.type === "circle") && element;

const isPencilElement = (element: DrawingElement) => (element.type === "pencil" || element.type === "eraser") && element;

//----------------------------------------------------------------------------------------------------------------------

const adjustShapeElementCoordinates = (element: DrawingElement): Coordinates => {
    const {type, coordinates} = element;
    if (!coordinates) return {x1: 0, y1: 0, x2: 0, y2: 0};
    const {x1, y1, x2, y2} = coordinates;

    if (type === "rectangle") {
        const minX = Math.min(x1, x2);
        const maxX = Math.max(x1, x2);
        const minY = Math.min(y1, y2);
        const maxY = Math.max(y1, y2);
        return {x1: minX, y1: minY, x2: maxX, y2: maxY};
    } else {
        if (x1 < x2 || (x1 === x2 && y1 < y2)) {
            return {x1, y1, x2, y2};
        } else {
            return {x1: x2, y1: y2, x2: x1, y2: y1};
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
    const {x1, y1, x2, y2} = coordinates;
    switch (position) {
        case "tl":
        case "start":
        case "arc":
            return {x1: clientX, y1: clientY, x2, y2};
        case "tr":
            return {x1, y1: clientY, x2: clientX, y2};
        case "bl":
            return {x1: clientX, y1, x2, y2: clientY};
        case "br":
        case "end":
            return {x1, y1, x2: clientX, y2: clientY};
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

const handleUndoAction = (elements: DrawingElement[], actions: DrawingAction[]) => {
    const indexBeforeTheUndo = actions.length - 1
    let i = 0;
    while (actions[indexBeforeTheUndo - i].type === ActionType.UNDO) {
        i++;
    }
    const actionToUndo = actions[indexBeforeTheUndo - (i * 2)];
    let newElements = [...elements];

    switch (actionToUndo.type) {
        case ActionType.DRAW:
            if (actionToUndo.element) {
                newElements = elements.filter(element => element.id !== actionToUndo.element?.id);
            }
            break;
        case ActionType.UPDATE:
            const oldElement = elements.find(element => element.id === actionToUndo.elementId);
            if (!oldElement) return elements;
            if (actionToUndo.points && (oldElement.type === "pencil" || oldElement.type === "eraser")) {
                actionToUndo.points.forEach((point, index) => {
                    if (!oldElement.points || !oldElement.points[index]) return;
                    oldElement.points[index].x -= point.x;
                    oldElement.points[index].y -= point.y;
                })
                newElements = elements.map((el) => el.id === oldElement.id ? oldElement : el);

            } else if (actionToUndo.coordinates && oldElement.coordinates && (oldElement.type === "rectangle" || oldElement.type === "line" || oldElement.type === "circle")) {
                const c = actionToUndo.coordinates;
                const updatedElement = updateShapeElement(
                    oldElement,
                    {
                        x1: oldElement.coordinates.x1 - c.x1,
                        y1: oldElement.coordinates.y1 - c.y1,
                        x2: oldElement.coordinates.x2 - c.x2,
                        y2: oldElement.coordinates.y2 - c.y2
                    });
                newElements = elements.map((el) => el.id === updatedElement.id ? updatedElement : el);
            }
            break;
    }
    return newElements;
};
const handleAction = (action: DrawingAction, elements: DrawingElement[], currentActions: DrawingAction[]) => {
    let newElements = [...elements];
    switch (action.type) {
        case ActionType.DRAW:
            if (action.element) {
                const element = action.element;
                let index = 0;
                if (elements) {
                    index = elements.length;
                }
                let newElement: DrawingElement | undefined;
                if (element.points) {
                    newElement = {
                        index,
                        id: element.id,
                        type: element.type,
                        points: [{x: element.points[0].x, y: element.points[0].y}],
                        color: element.color,
                        size: element.size
                    };
                    element.points.forEach((point, index) => {
                        if (index === 0 || !newElement?.points) return;
                        newElement = {...newElement, points: [...newElement.points, {x: point.x, y: point.y}]};
                    })
                } else if (element.coordinates) {
                    newElement = {
                        index,
                        id: element.id,
                        type: element.type,
                        color: element.color,
                        coordinates: element.coordinates,
                        roughElement: element.type === "text" ? undefined : generateRoughElement(element),
                        text: element.text
                    };
                }
                if (newElement) {
                    newElements = [...newElements, newElement];
                }
            }
            break;
        case ActionType.UPDATE:
            const oldElement = elements.find(element => element.id === action.elementId);
            if (!oldElement) return elements;
            if (action.points && (oldElement.type === "pencil" || oldElement.type === "eraser")) {

                action.points.forEach((point, index) => {
                    if (!oldElement.points || !oldElement.points[index]) return;
                    oldElement.points[index].x += point.x;
                    oldElement.points[index].y += point.y;
                })
                newElements = elements.map((el) => el.id === oldElement.id ? oldElement : el);

            } else if (action.coordinates && oldElement.coordinates && (oldElement.type === "rectangle" || oldElement.type === "line" || oldElement.type === "circle")) {
                const c = action.coordinates;
                const updatedElement = updateShapeElement(
                    oldElement,
                    {
                        x1: oldElement.coordinates.x1 + c.x1,
                        y1: oldElement.coordinates.y1 + c.y1,
                        x2: oldElement.coordinates.x2 + c.x2,
                        y2: oldElement.coordinates.y2 + c.y2
                    });
                newElements = elements.map((el) => el.id === updatedElement.id ? updatedElement : el);
            }
            break;
        case ActionType.UNDO:
            newElements = handleUndoAction(elements, currentActions);
            break;
    }
    newElements = updateElementIndexes(newElements);
    return newElements;
};


const updateElementIndexes = (elements: DrawingElement[]): DrawingElement[] => {
    return elements.map((element, index) => ({...element, index}));
};

const useActions = (initialActions: DrawingAction[], onActionsChange: (newActions: DrawingAction[]) => void)
    : [DrawingElement[], (action: DrawingAction, overwrite?: boolean) => void, () => void, () => void] => {
    const [elements, setElements] = useState<DrawingElement[]>([]);
    const [actions, setActions] = useState<DrawingAction[]>([]);

    const pushAction = (action: DrawingAction, overwrite = false) => {
        let newElements;
        newElements = handleAction(action, elements, actions);
        console.log("Updated Elements", newElements)
        setElements(newElements);
        if (!overwrite) {
            console.log("Action", action)
            if (!action.index) action.index = actions.length
            setActions([...actions, action])
        }
    };


    const undo = () => {
        if (actions.length === 0) return;
        // count the number of undo Actions and if it's more than the other actions return
        let undoNumber = 0;
        actions.forEach((action) => {
            if (action.type === ActionType.UNDO) {
                undoNumber++;
            }
        })
        if (undoNumber >= actions.length - undoNumber) return;

        pushAction({
            index: actions.length,
            type: ActionType.UNDO
        });
    }

    const redo = () => {
        if (actions[actions.length - 1].type !== ActionType.UNDO) return;
        const newActions = actions.splice(actions.length - 1, 1);
        setActions(newActions);
        pushAction(newActions[newActions.length - 1], true);
    }
    useEffect(() => {
        // push Action one by actions with 1 second delay
        let oldElements: DrawingElement[] = [];
        initialActions.forEach((action, index) => {
            setTimeout(() => {
                oldElements = handleAction(action, oldElements, actions)
                console.log("elements", oldElements)
                setElements(oldElements);
                if (!action.index) action.index = actions.length
                setActions([...actions, action])
            }, index * 100);
        });

    }, [])

    useEffect(() => {
        onActionsChange(actions);
    }, [actions]);

    return [elements, pushAction, undo, redo];
};

//----------------------------------------------------------------------------------------------------------------------

// const createElement = (index: number, id: number, x1: number, y1: number, x2: number, y2: number, type: string, color: string, pencilSize?: number): DrawingElement => {
//     let element: DrawingElement;
//
//     switch (type) {
//         case "pencil":
//             element = {index, id, type, points: [{x: x1, y: y1}], color, size: pencilSize ?? 24};
//             break;
//         case "eraser":
//             element = {
//                 index,
//                 id,
//                 type,
//                 points: [{x: x1, y: y1}],
//                 color: document.body.style.backgroundColor,
//                 size: pencilSize ?? 24
//             };
//             break;
//         case "text":
//             element = {index, id, type, coordinates: {x1, y1, x2, y2}, text: "", color};
//             break;
//         default:
//             throw new Error('Type not recognised');
//     }
//
//     return element;
// };

const generateRoughElement = (element: DrawingElement) => {
    if (!element.coordinates) return;
    const {type, color, coordinates: {x1, x2, y1, y2}} = element
    if (type === "line") {
        return generator.line(x1, y1, x2, y2, {stroke: color});
    } else if (type === "rectangle") {
        return generator.rectangle(x1, y1, x2 - x1, y2 - y1, {stroke: color});
    } else if (type === "circle") {
        return generator.circle(x1, y1, Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2), {stroke: color});
    }
};
const updateShapeElement = (element: DrawingElement, coordinates: Coordinates): DrawingElement => {
    const newElement = {...element, coordinates};
    newElement.roughElement = generateRoughElement(newElement);
    return newElement
}

const updateTextElement = (element: DrawingElement, newPoint: Point, text?: string): DrawingElement => {
    const {x, y} = newPoint
    const textWidth = 24
    const textHeight = 24;
    return {
        ...element,
        coordinates: {x1: x, y1: y, x2: x + textWidth, y2: y + textHeight},
        text: text ?? element.text
    }
}

const updatePencilElement = (element: DrawingElement, points: Point[]): DrawingElement => {
    return {...element, points}
}

const drawElement = (roughCanvas: RoughCanvas, context: CanvasRenderingContext2D, element: DrawingElement) => {
    switch (element.type) {
        case "line":
        case "rectangle":
        case "circle" :
            if (element.roughElement)
                roughCanvas.draw(element.roughElement);
            break;
        case "pencil":
        case "eraser":
            if (!element.points) return;
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
            if (!element.coordinates || !element.text) return;
            context.fillText(element.text, element.coordinates.x1, element.coordinates.y1);
            break;
        default:
            throw new Error(`Type not recognised`);
    }
};


const adjustmentRequired = (type: string) => ['line', 'rectangle'].includes(type);

//----------------------------------------------------------------------------------------------------------------------


function DrawingComponent({initialActions = [], isEditable, onActionsChange, onSave}: {
    initialActions?: DrawingAction[],
    isEditable: boolean,
    onActionsChange?: (newActions: DrawingAction[]) => void,
    onSave?: () => void
}) {


    const [elements, pushAction, undo, redo] = useActions(initialActions, onActionsChange ?? (() => {
    }))

    const [drawnElements, setDrawnElements] = useState<DrawingElement[]>(elements)

    const [color, setColor] = useState<string>('#000');

    const [state, setState] = useState("none");

    const [tool, setTool] = useState("pencil");

    const [selectedElement, setSelectedElement] = useState<any>(null);


    const [pencilSize, setPencilSize] = useState<number>(24);

    const [eraserSize, setEraserSize] = useState<number>(24);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const textAreaRef = useRef<HTMLTextAreaElement>(null);
    const nextIdRef = useRef(0);


    useLayoutEffect(() => {
        if (!drawnElements) return;
        const canvas = canvasRef.current!;
        const context = canvas.getContext('2d')!;
        const roughCanvas = rough.canvas(canvas);

        // Set the size of the drawing surface to match the size of the element

        context.clearRect(0, 0, canvas.width, canvas.height);

        context.save();

        document.body.style.backgroundColor = 'white';

        drawnElements.forEach(element => {
            if (state === "writing" && selectedElement.id === element.id) return;
            drawElement(roughCanvas, context, element)
        })

        context.restore();

    }, [drawnElements, color, state, selectedElement, pencilSize, eraserSize]);


// Always keep the ref updated with the latest state

    useEffect(() => {
        setDrawnElements(elements)
    }, [elements]);

    useEffect(() => {


        const canvas = canvasRef.current!;
        // Set the size of the drawing surface to match the size of the element
        canvas.width = 1280;
        canvas.height = 720;
        // Add the event listener when the component mounts

        const context = canvas.getContext('2d')!;
        const roughCanvas = rough.canvas(canvas);

        // Set the size of the drawing surface to match the size of the element

        context.clearRect(0, 0, canvas.width, canvas.height);

        context.save();

        document.body.style.backgroundColor = 'white';

        drawnElements.forEach(element => {
            if (state === "writing" && selectedElement.id === element.id) return;
            drawElement(roughCanvas, context, element)
        })

        context.restore();
    }, []); // Empty dependency array means this effect runs once on mount and clean up on unmount


    useEffect(() => {
        window.addEventListener('mouseup', handleMouseUp);

        // Clean up the event listener when the component unmounts
        return () => {
            window.removeEventListener('mouseup', handleMouseUp);
        };

    }, [
        drawnElements,
        selectedElement,
        state,
        tool,
        color,
        pencilSize,
        eraserSize,
    ]); // Empty dependency array means this effect runs once on mount and clean up on unmount


    isEditable && useEffect(() => {
        const undoRedoFunction = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && event.key === "z") {
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

    useEffect(() => {
        if (textAreaRef.current) {
            const textArea = textAreaRef.current;
            if (state === "writing") {
                setTimeout(() => {
                    textArea.focus();
                    textArea.value = selectedElement.text ?? "";
                }, 0);
            }
        }
    }, [state, selectedElement]);


//--------------------------------------------------------------------------------------------------------------------


    const getMouseCoordinates = (event: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = event.target as HTMLCanvasElement;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const clientX = (event.clientX - rect.left) * scaleX;
        const clientY = (event.clientY - rect.top) * scaleY;
        return {clientX, clientY};
    };
    const getMouseCoordinatesFromScreen = (event: MouseEvent, canvas: HTMLCanvasElement) => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const clientX = (event.clientX - rect.left) * scaleX;
        const clientY = (event.clientY - rect.top) * scaleY;
        return {clientX, clientY};
    };

//--------------------------------------------------------------------------------------------------------------------

    const handleMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isEditable) return;
        const {clientX, clientY} = getMouseCoordinates(event);
        if (tool === "selection") {
            const clickedElement = getElementAtPosition(clientX, clientY, drawnElements);
            if (clickedElement?.element && clickedElement.position && clickedElement.element.type !== "eraser") {
                const {element, position} = clickedElement;

                if (element.coordinates) {
                    const offsetX = clientX - element.coordinates.x1;
                    const offsetY = clientY - element.coordinates.y1;
                    setSelectedElement({...element, offsetX, offsetY, position: position});
                } else if (element.points) {
                    const xOffsets = element.points.map(point => clientX - point.x);
                    const yOffsets = element.points.map(point => clientY - point.y);
                    setSelectedElement({...element, xOffsets, yOffsets});
                }

                // setElements(prevState => prevState ?? prevState);

                if (clickedElement.position === "inside") {
                    setState("moving");

                } else {
                    setState("resizing");
                }
            }
        } else {
            const id = nextIdRef.current;
            nextIdRef.current++;
            const index = drawnElements.length;
            let size;
            if (tool === "pencil") size = pencilSize;
            if (tool === "eraser") size = eraserSize;
            let element: DrawingElement = {
                index,
                id,
                type: tool as "rectangle" | "line" | "circle" | "text" | "pencil" | "eraser",
                color,
                size,
            };
            if (tool === "rectangle" || tool === "line" || tool === "circle") {
                element = updateShapeElement(element, {x1: clientX, y1: clientY, x2: clientX, y2: clientY});
            } else if (tool === "text") {
                element = updateTextElement(element, {x: clientX, y: clientY});
            } else if (tool === "pencil" || tool === "eraser") {
                element = updatePencilElement(element, [{x: clientX, y: clientY}]);
            }

            setDrawnElements([...drawnElements, element]);
            setSelectedElement(element);
            // oldElement = {...element};
            let newState = tool === "text" ? "writing" : "drawing";
            setState(newState);
            // actionRef = newAction;

        }
    };

//--------------------------------------------------------------------------------------------------------------------

    const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isEditable || state === "none") return;
        const {clientX, clientY} = getMouseCoordinates(event);
        if (tool === "selection") {
            const clickedElement = getElementAtPosition(clientX, clientY, drawnElements);
            const target = event.target as HTMLElement;
            if (clickedElement?.element.type !== "eraser") {
                target.style.cursor = clickedElement
                    ? cursorForPosition(clickedElement.position!)
                    : "default";
            }
        }

        let updatedElement;
        const index = selectedElement.index;

        if (state === "drawing") {
            const element = drawnElements[index]
            if (isShapeElement(element) && element.coordinates) {
                const {x1, y1} = element.coordinates;
                updatedElement = updateShapeElement(element, {x1, y1, x2: clientX, y2: clientY});
            } else if (isPencilElement(element) && element.points) {
                updatedElement = updatePencilElement(element, [...(element.points), {
                    x: clientX,
                    y: clientY
                }]);
            }
        } else if (state === "writing") {
            const element = drawnElements[index]
            const updatedElement = updateTextElement(element, {
                x: clientX,
                y: clientY
            }, textAreaRef.current?.value ?? "");
            setDrawnElements([...drawnElements, updatedElement]);
        } else if (state === "moving") {
            if (selectedElement.type === "pencil" || selectedElement.type === "eraser") {
                const newPoints: Point[] = selectedElement.points.map((_: number, index: number) => ({
                    x: clientX - selectedElement.xOffsets[index],
                    y: clientY - selectedElement.yOffsets[index],
                }));
                updatedElement = updatePencilElement(selectedElement, newPoints);
            } else {
                const {coordinates, offsetX, offsetY} = selectedElement;
                const width = coordinates.x2 - coordinates.x1;
                const height = coordinates.y2 - coordinates.y1;
                const newX1 = clientX - offsetX;
                const newY1 = clientY - offsetY;
                const newCoordinates = {x1: newX1, y1: newY1, x2: newX1 + width, y2: newY1 + height};
                if (selectedElement.type == "text") {
                    updatedElement = updateTextElement(selectedElement, {x: newX1, y: newY1});
                } else {
                    updatedElement = updateShapeElement(selectedElement, newCoordinates);
                }
            }
        } else if (state === "resizing") {
            const {position, coordinates} = selectedElement;
            const newCoordinates = resizedCoordinates(clientX, clientY, position, coordinates)!;
            updatedElement = updateShapeElement(selectedElement, newCoordinates);
        }
        if (updatedElement) {
            const updatedElements = [...drawnElements]
            updatedElements[index] = updatedElement;
            setDrawnElements(updatedElements);
        }
    }

//----------------------------------------------------------------------------------------------------------------------


//----------------------------------------------------------------------------------------------------------------------

    const handleMouseUp = (event: MouseEvent) => {
        if (!isEditable) return;

        if (!canvasRef.current) return;
        const {clientX, clientY} = getMouseCoordinatesFromScreen(event, canvasRef.current);

        if (selectedElement) {

            const index = selectedElement.index;
            const element = drawnElements[index];

            if (element.type === "text" &&
                clientX - selectedElement.offsetX === selectedElement.x1 &&
                clientY - selectedElement.offsetY === selectedElement.y1) {
                let drawingElement: DrawingElement;
                // actionRef = "writing";
                drawingElement = {
                    index: element.index,
                    id: element.id,
                    coordinates: element.coordinates,
                    type: element.type,
                    text: element.text,
                    color: element.color
                }
                pushAction({
                    elementId: element.id,
                    type: ActionType.DRAW,
                    element: drawingElement
                })
                return;
            }

            if ((state === "drawing" || state === "resizing") && adjustmentRequired(element.type)) {
                const newCoordinates = adjustShapeElementCoordinates(element);
                const updatedElement = updateShapeElement(element, newCoordinates);
                const updatedElements = [...drawnElements];
                updatedElements[index] = updatedElement;
            }
            if (state === "drawing") {
                let drawingElement: DrawingElement | undefined;
                switch (element.type) {
                    case "rectangle":
                    case "line":
                    case "circle":
                        drawingElement = {
                            index: element.index,
                            id: element.id,
                            coordinates: element.coordinates,
                            type: element.type,
                            color: element.color,
                        }
                        break;
                    case "pencil":
                    case "eraser":
                        drawingElement = {
                            index: element.index,
                            id: element.id,
                            points: element.points,
                            type: element.type,
                            color: element.color,
                            size: element.size
                        }
                        break;
                }

                if (drawingElement) {
                    pushAction({
                        elementId: element.id,
                        type: ActionType.DRAW,
                        element: drawingElement
                    });
                }

            } else if (state === "resizing" || state === "moving") {
                const oldElement = elements[index]
                switch (element.type) {
                    case "rectangle":
                    case "line":
                    case "circle":
                        if (!element.coordinates || !oldElement.coordinates) return;
                        const deltaCoordinates = {
                            x1: element.coordinates.x1 - oldElement.coordinates.x1,
                            y1: element.coordinates.y1 - oldElement.coordinates.y1,
                            x2: element.coordinates.x2 - oldElement.coordinates.x2,
                            y2: element.coordinates.y2 - oldElement.coordinates.y2
                        };
                        pushAction({
                            elementId: element.id,
                            type: ActionType.UPDATE,
                            coordinates: deltaCoordinates
                        })
                        break;
                    case "pencil":
                    case "eraser":
                        if (!element.points || !oldElement.points) return;
                        const deltaPoints: Point[] = element.points.map((point, index) => {
                            if (!oldElement.points) return point;
                            return {
                                x: point.x - (oldElement.points[index]?.x ?? 0),
                                y: point.y - (oldElement.points[index]?.y ?? 0)
                            }
                        });
                        pushAction({
                            elementId: element.id,
                            type: ActionType.UPDATE,
                            points: deltaPoints
                        })
                        break;
                }
            } else if (state === "writing") {
                const updatedElement = updateTextElement(element, {x: clientX, y: clientY}, textAreaRef.current?.value);
                pushAction({
                    elementId: element.id,
                    type: ActionType.DRAW,
                    element: updatedElement
                })
            }
        }

        if (state !== "writing") {
            setState("none");
            // actionRef = "none"
            setSelectedElement(null);
            // oldElement = null
        }
    }

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


//----------------------------------------------------------------------------------------------------------------------


// ---------------------------------------------------------------------------------------------------------------------
    return (
        <div className={"drawing-page"}>
            {isEditable &&
                <div className={"tools-container"}>
                    <input type="radio"
                           id="selection"
                           checked={tool === "selection"}
                           onChange={() => handleToolChange("selection")}/>
                    <label htmlFor="Slection">Selection</label>
                    <input type="radio"
                           id="line"
                           checked={tool === "line"}
                           onChange={() => handleToolChange("line")}/>
                    <label htmlFor="Line">Line</label>
                    <input type="radio"
                           id="rectangle"
                           checked={tool === "rectangle"}
                           onChange={() => handleToolChange("rectangle")}/>
                    <label htmlFor="Rectangle">Rectangle</label>
                    <input type="radio"
                           id="circle"
                           checked={tool === "circle"}
                           onChange={() => handleToolChange("circle")}/>
                    <label htmlFor="Circle">Circle</label>
                    <input type="radio"
                           id="pencil"
                           checked={tool === "pencil"}
                           onChange={() => handleToolChange("pencil")}/>
                    <label htmlFor="Pencil">Pencil</label>
                    {tool === "pencil" &&
                        <input id="pencilSize" type="range" min="1" max="100" value={pencilSize}
                               onChange={(event) => setPencilSize(parseInt(event.currentTarget.value))}/>
                    }

                    <input type="radio"
                           id="text"
                           checked={tool === "text"}
                           onChange={() => handleToolChange("text")}/>
                    <label htmlFor="text">Text</label>

                    <div>
                        <button onClick={undo}>Undo</button>
                        <button onClick={redo}>Redo</button>
                    </div>
                    {tool === "text" ? (
                        <textarea
                            ref={textAreaRef}

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
                                                 onChange={(event) => setEraserSize(parseInt(event.currentTarget.value))}/>) : null}
                    <input
                        type="radio"
                        id="colorPicker"
                        checked={tool === "colorPicker"}
                        onChange={() => setTool("colorPicker")}
                    />
                    <label htmlFor="ColorPicker">Colors</label>
                    {tool === "colorPicker" &&
                        <ChromePicker color={color} onChange={(event) => {
                            setColor(event.hex);
                        }}/>
                    }
                </div>}
            <div className={"canvas-container"}>
                <canvas ref={canvasRef}
                        id="canvas"
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}>
                    Canvas
                </canvas>
            </div>
            {isEditable && <button onClick={onSave}>Save Drawing</button>}
        </div>

    );
}

export default DrawingComponent;
