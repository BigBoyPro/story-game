import React, {useEffect, useLayoutEffect, useRef, useState} from "react";
import rough from 'roughjs';
import {Drawable} from "roughjs/bin/core";
import {RoughCanvas} from "roughjs/bin/canvas";
import getStroke from "perfect-freehand";
import {ChromePicker} from "react-color";
import "./DrawingComponent.css"

// import { FaPencilAlt, FaRegSquare, FaRegCircle, FaEraser, FaFont } from 'react-icons/fa';


import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPencilAlt, faEraser, faFont, faMinus, faHand } from '@fortawesome/free-solid-svg-icons';
import { faSquare, faCircle } from '@fortawesome/free-regular-svg-icons';


import {DRAW_INITIAL_ACTIONS_MILLISECONDS} from "../StoryElementComponent/StoryElementComponent.tsx";


//----------------------------------------------------------------------------------------------------------------------

const generator = rough.generator();

type Coordinates = { x1: number, y1: number, x2: number, y2: number };
type Point = { x: number, y: number };

type DrawingElement = {
    index: number;
    id: number;
    type: ElementType;
    color: string;
    coordinates?: Coordinates,
    points?: Point[],
    point?: Point,
    size?: number;
    text?: string;
    fill?: true;
    roughElement?: Drawable
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
    point?: Point
}


enum ElementType {
    Rectangle = 0,
    Line = 1,
    Ellipse = 2,
    Text = 3,
    Pencil = 4,
    Eraser = 5
}

enum AltTool {
    Selection = 6,
}

type Tool = ElementType | AltTool;

enum State {
    None,
    Drawing,
    Writing,
    Moving,
    Resizing
}

enum Position {
    TopLeft,
    TopRight,
    BottomLeft,
    BottomRight,
    Inside,
    Start,
    End,
    Arc
}

//----------------------------------------------------------------------------------------------------------------------

//----------------------------------------------------------------------------------------------------------------------

const nearPoint = (x: number, y: number, x1: number, y1: number, position: Position, maxDistance: number): Position | null => {
    return Math.abs(x - x1) < maxDistance && Math.abs(y - y1) < maxDistance ? position : null;
};

const distance = (a: { x: number, y: number }, b: {
    x: number,
    y: number
}) => Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));

const onLine = (x1: number, y1: number, x2: number, y2: number, x: number, y: number, maxDistance: number): Position | null => {
    const a = {x: x1, y: y1};
    const b = {x: x2, y: y2};
    const c = {x, y};
    const offset = distance(a, b) - (distance(a, c) + distance(b, c));
    return Math.abs(offset) < maxDistance ? Position.Inside : null;
};


const positionWithinElement = (x: number, y: number, element: DrawingElement, canvas: HTMLCanvasElement, canvasWidth: number, canvasHeight: number): Position | null => {
    let x1, y1, x2, y2;
    const maxDistance = 20 / canvasWidth;
    switch (element.type) {
        case ElementType.Line:
            if (!element.coordinates) return null;
            ({x1, y1, x2, y2} = element.coordinates);
            const on = onLine(x1, y1, x2, y2, x, y, maxDistance);
            if (on) return on;
            const start = nearPoint(x, y, x1, y1, Position.Start, maxDistance);
            if (start) return start;
            const end = nearPoint(x, y, x2, y2, Position.End, maxDistance);
            if (end) return end;
            return null;

        case ElementType.Rectangle:
            if (!element.coordinates) return null;
            ({x1, y1, x2, y2} = element.coordinates);
            const topLeft = nearPoint(x, y, x1, y1, Position.TopLeft, maxDistance);
            if (topLeft !== null) return topLeft;
            const topRight = nearPoint(x, y, x2, y1, Position.TopRight, maxDistance);
            if (topRight !== null) return topRight;
            const bottomLeft = nearPoint(x, y, x1, y2, Position.BottomLeft, maxDistance);
            if (bottomLeft !== null) return bottomLeft;
            const bottomRight = nearPoint(x, y, x2, y2, Position.BottomRight, maxDistance);
            if (bottomRight !== null) return bottomRight;
            const inside = x >= x1 && x <= x2 && y >= y1 && y <= y2 ? Position.Inside : null;
            if (inside !== null) return inside;
            return null;
        case ElementType.Ellipse:
            if (!element.coordinates) return null;
            ({x1, y1, x2, y2} = element.coordinates);
            const centerX = x1 + (x2 - x1) / 2;
            const centerY = y1 + (y2 - y1) / 2;
            const topLeftEllipse = nearPoint(x, y, x1, y1, Position.TopLeft, maxDistance);
            if (topLeftEllipse !== null) return topLeftEllipse;
            const topRightEllipse = nearPoint(x, y, x2, y1, Position.TopRight, maxDistance);
            if (topRightEllipse !== null) return topRightEllipse;
            const bottomLeftEllipse = nearPoint(x, y, x1, y2, Position.BottomLeft, maxDistance);
            if (bottomLeftEllipse !== null) return bottomLeftEllipse;
            const bottomRightEllipse = nearPoint(x, y, x2, y2, Position.BottomRight, maxDistance);
            if (bottomRightEllipse !== null) return bottomRightEllipse;
            // const insideEllipse = Math.abs(radius - (x2 - x1) / 2) < maxDistance ? Position.Inside : null;
            const horizontalRadius = Math.abs(x2 - x1) / 2;
            const verticalRadius = Math.abs(y2 - y1) / 2;
            const insideEllipse = Math.pow(x - centerX, 2) / Math.pow(horizontalRadius, 2) + Math.pow(y - centerY, 2) / Math.pow(verticalRadius, 2) <= 1 ? Position.Inside : null;
            if (insideEllipse !== null) return insideEllipse;
            return null;
        case ElementType.Pencil:
        case ElementType.Eraser:
            if (!element.points) return null;
            const betweenAnyPoint = element.points.some((point, index) => {
                if (!element.points) return;
                const nextPoint = element.points[index + 1];
                if (!nextPoint) return false;
                return onLine(point.x, point.y, nextPoint.x, nextPoint.y, x, y, maxDistance) != null;
            });
            return betweenAnyPoint ? Position.Inside : null;
        case ElementType.Text:
            if (!element.point || !element.text) return null;
            const {x: pointX, y: pointY} = element.point;
            const context = canvas.getContext('2d');
            if (context) context.font = "2.4rem sans-serif"; // Set the font to match the font used when drawing the text
            const lines = element.text.split('\n');
            const textWidth = Math.max(...lines.map(line => (context ? context.measureText(line).width : 24))) / canvasWidth; // Get the width of the longest line
            const lineHeight = 24 / canvasHeight; // Normalize the line height
            const textHeight = lines.length * lineHeight; // Calculate the height of the text block
            return x >= pointX && x <= pointX + textWidth && y >= pointY && y <= pointY + textHeight ? Position.Inside : null;
        default:
            return null
    }
};

//----------------------------------------------------------------------------------------------------------------------

const getElementAtPosition = (x: number, y: number, elements: DrawingElement[], canvas: HTMLCanvasElement, canvasWeight: number, canvasHeight: number):
    { element: DrawingElement, position: Position | null } | undefined => {
    const elementsAtPosition = elements
        .map(element =>
            ({
                element,
                position: positionWithinElement(x, y, element, canvas, canvasWeight, canvasHeight)
            }));
    if (elementsAtPosition.some(element => (element.element.type === ElementType.Eraser && element.position === Position.Inside))) return;

    return elementsAtPosition.find(({position}) => position !== null);
};

//----------------------------------------------------------------------------------------------------------------------

const adjustShapeElementCoordinates = (element: DrawingElement): Coordinates => {
    const {type, coordinates} = element;
    if (!coordinates) return {x1: 0, y1: 0, x2: 0, y2: 0};
    const {x1, y1, x2, y2} = coordinates;

    if (type === ElementType.Rectangle) {
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

const cursorForPosition = (position: Position) => {
    switch (position) {
        case Position.TopLeft:
        case Position.BottomRight:
        case Position.Start:
        case Position.End:
        case Position.Arc:
            return "nwse-resize";
        case Position.TopRight:
        case Position.BottomLeft:
            return "nesw-resize";
        default:
            return "move";
    }
};

const resizedCoordinates = (clientX: number, clientY: number, position: Position, coordinates: Coordinates) => {
    const {x1, y1, x2, y2} = coordinates;
    switch (position) {
        case Position.TopLeft:
        case Position.Start:
        case Position.Arc:
            return {x1: clientX, y1: clientY, x2, y2};
        case Position.TopRight:
            return {x1, y1: clientY, x2: clientX, y2};
        case Position.BottomLeft:
            return {x1: clientX, y1, x2, y2: clientY};
        case Position.BottomRight:
        case Position.End:
            return {x1, y1, x2: clientX, y2: clientY};
        default:
            return null;
    }
};

const findActionToUndo = (actions: DrawingAction[]): number | null => {
    // Iterate from the end to the beginning
    let skip = 0;
    for (let i = actions.length - 1; i >= 0; i--) {
        const action = actions[i];

        // If the action is an UNDO action, skip the next action
        if (action.type === ActionType.UNDO) {
            skip++;
        } else {
            skip--;
        }
        // If the action is an action to undo, return its index
        if (skip < 0) {
            return i;
        }
    }
    // If no action to undo is found, return null
    return null;
};
//----------------------------------------------------------------------------------------------------------------------

const handleUndoAction = (elements: DrawingElement[], actions: DrawingAction[]): DrawingElement[] => {

    let newElements = [...elements];

    // Find the last action that was not an UNDO action, skipping the actions that have been undone
    const actionToUndoIndex = findActionToUndo(actions);
    if (actionToUndoIndex === null) return newElements;
    const actionToUndo = actions[actionToUndoIndex];

    if (!actionToUndo) return newElements;

    switch (actionToUndo.type) {
        case ActionType.DRAW:
            if (actionToUndo.element) {
                newElements = elements.filter(element => element.id !== actionToUndo.element?.id);
            }
            break;
        case ActionType.UPDATE:
            const oldElement = elements.find(element => element.id === actionToUndo.elementId);
            if (!oldElement) return elements;
            if (actionToUndo.points && (oldElement.type === ElementType.Pencil || oldElement.type === ElementType.Eraser)) {
                actionToUndo.points.forEach((point, index) => {
                    if (!oldElement.points || !oldElement.points[index]) return;
                    oldElement.points[index].x -= point.x;
                    oldElement.points[index].y -= point.y;
                })
                newElements = elements.map((el) => el.id === oldElement.id ? oldElement : el);

            } else if (actionToUndo.coordinates && oldElement.coordinates &&
                (oldElement.type === ElementType.Rectangle || oldElement.type === ElementType.Line || oldElement.type === ElementType.Ellipse)) {
                const c = actionToUndo.coordinates;
                const updatedElement = updateShapeElement(oldElement, {
                    x1: oldElement.coordinates.x1 - c.x1,
                    y1: oldElement.coordinates.y1 - c.y1,
                    x2: oldElement.coordinates.x2 - c.x2,
                    y2: oldElement.coordinates.y2 - c.y2
                });
                newElements = elements.map((el) => el.id === updatedElement.id ? updatedElement : el);
            } else if (oldElement.point && actionToUndo.point) {
                const updatedElement = updateTextElement(oldElement, {
                    x: oldElement.point.x - actionToUndo.point.x,
                    y: oldElement.point.y - actionToUndo.point.y
                }, oldElement.text);
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
                } else if (element.coordinates || element.point) {
                    newElement = {
                        index,
                        id: element.id,
                        type: element.type,
                        color: element.color,
                        coordinates: element.coordinates,
                        point: element.point,
                        text: element.text,
                        fill: element.fill
                    }
                }
                if (newElement) {
                    newElements = [...newElements, newElement];
                }
            }
            break;
        case ActionType.UPDATE:
            const oldElement = elements.find(element => element.id === action.elementId);
            if (!oldElement) return elements;
            if (action.points && (oldElement.type === ElementType.Pencil || oldElement.type === ElementType.Eraser)) {

                action.points.forEach((point, index) => {
                    if (!oldElement.points || !oldElement.points[index]) return;
                    oldElement.points[index].x += point.x;
                    oldElement.points[index].y += point.y;
                })
                newElements = elements.map((el) => el.id === oldElement.id ? oldElement : el);

            } else if (action.coordinates && oldElement.coordinates &&
                (oldElement.type === ElementType.Rectangle || oldElement.type === ElementType.Line || oldElement.type === ElementType.Ellipse)) {
                const c = action.coordinates;
                const updatedElement = updateShapeElement(oldElement, {
                    x1: oldElement.coordinates.x1 + c.x1,
                    y1: oldElement.coordinates.y1 + c.y1,
                    x2: oldElement.coordinates.x2 + c.x2,
                    y2: oldElement.coordinates.y2 + c.y2
                });
                newElements = elements.map((el) => el.id === updatedElement.id ? updatedElement : el);
            } else if (oldElement.point && action.point) {
                const updatedElement = updateTextElement(oldElement, {
                    x: oldElement.point.x + action.point.x,
                    y: oldElement.point.y + action.point.y
                }, oldElement.text);
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


const useActions = (initialActions: DrawingAction[], nextIdRef: React.MutableRefObject<number>, isEditable: boolean, onActionsChange: (newActions: DrawingAction[]) => void)
    : [DrawingElement[], (action: DrawingAction, overwrite?: boolean) => void, () => void, () => void, () => void] => {
    const [elements, setElements] = useState<DrawingElement[]>([]);
    const [actions, setActions] = useState<DrawingAction[]>([]);

    const pushAction = (action: DrawingAction, overwrite = false) => {
        const newElements = handleAction(action, elements, actions);
        setElements(newElements);
        if (!overwrite) {
            if (!action.index) action.index = actions.length
            setActions([...actions, action])
        }
    };


    const undo = () => {
        if (actions.length === 0 || findActionToUndo(actions) === null) return;
        pushAction({
            index: actions.length,
            type: ActionType.UNDO
        });
    }

    const redo = () => {
        if (actions[actions.length - 1] === undefined || actions[actions.length - 1].type !== ActionType.UNDO) return;
        const newActions = actions.slice(0, actions.length - 1);
        setActions(newActions);
        const actionToRedo = findActionToUndo(newActions);
        if (actionToRedo !== null) pushAction(newActions[actionToRedo], true);
    }

    const onCanvasChange = () => {
        setElements(elements.map((element) => ({...element, roughElement: undefined})));
    }

    useEffect(() => {
        // push Action one by actions with 1-second delay
        let oldElements: DrawingElement[] = [];
        let oldActions: DrawingAction[] = [];
        const totalActions = initialActions.length;
        const totalDuration = isEditable ? DRAW_INITIAL_ACTIONS_MILLISECONDS / 10 : DRAW_INITIAL_ACTIONS_MILLISECONDS; // Total duration in milliseconds

        initialActions.forEach((action, index) => {
            setTimeout(() => {
                oldElements = handleAction(action, oldElements, oldActions);
                setElements(oldElements);
                nextIdRef.current = Math.max(...oldElements.map(element => element.id)) + 1;
                action.index = index;
                oldActions = [...oldActions, action];
                setActions(oldActions);
            }, (index / totalActions) * totalDuration);
        });

    }, [])

    useEffect(() => {
        onActionsChange(actions);
    }, [actions]);

    return [elements, pushAction, undo, redo, onCanvasChange];
};

//----------------------------------------------------------------------------------------------------------------------

// const createElement = (index: number, id: number, x1: number, y1: number, x2: number, y2: number, type: string, color: string, pencilSize?: number): DrawingElement => {
//     let element: DrawingElement;
//
//     switch (type) {}
//         case ElementType.Pencil:
//             element = {index, id, type, points: [{x: x1, y: y1}], color, size: pencilSize ?? 24};
//             break;
//         case ElementType.Eraser:
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
//
//
//     return element;
// }

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


const generateRoughElement = (element: DrawingElement, canvasHeight: number, canvasWidth: number): Drawable | undefined => {
    if (!element.coordinates) return;
    const {type, color, coordinates: {x1, x2, y1, y2}} = element;
    // Convert normalized coordinates to pixel values
    const pixelX1 = x1 * canvasWidth;
    const pixelY1 = y1 * canvasHeight;
    const pixelX2 = x2 * canvasWidth;
    const pixelY2 = y2 * canvasHeight;
    if (type === ElementType.Line) {
        return generator.line(pixelX1, pixelY1, pixelX2, pixelY2, {stroke: color});
    } else if (type === ElementType.Rectangle) {
        return generator.rectangle(pixelX1, pixelY1, pixelX2 - pixelX1, pixelY2 - pixelY1, {
            stroke: color,
            fill: element.fill ? color : undefined,
            fillStyle: 'solid'
        });
    } else if (type === ElementType.Ellipse) {
        const width = pixelX2 - pixelX1;
        const height = pixelY2 - pixelY1;
        const centerX = pixelX1 + width / 2;
        const centerY = pixelY1 + height / 2;
        return generator.ellipse(centerX, centerY, width, height, {
            stroke: color,
            fillStyle: 'solid',
            fill: element.fill ? color : undefined
        });
    }
};
const updateShapeElement = (element: DrawingElement, coordinates: Coordinates, canvasHeight?: number, canvasWidth?: number, fill?: true): DrawingElement => {
    element.fill = element.fill ?? fill;
    const roughElement = (canvasWidth && canvasHeight) ? generateRoughElement({
        ...element,
        coordinates
    }, canvasHeight, canvasWidth) : undefined;
    return {...element, coordinates, roughElement: roughElement};
}

const updateTextElement = (element: DrawingElement, point: Point, text?: string): DrawingElement => {
    return {...element, point: point, text}
}

const updatePencilElement = (element: DrawingElement, points: Point[]): DrawingElement => {
    return {...element, points}
}

const drawElement = (roughCanvas: RoughCanvas, context: CanvasRenderingContext2D, element: DrawingElement, canvasWidth: number, canvasHeight: number) => {
    switch (element.type) {
        case ElementType.Line:
        case ElementType.Rectangle:
        case ElementType.Ellipse :
            if (!element.roughElement) element.roughElement = generateRoughElement(element, canvasHeight, canvasWidth);
            if (element.roughElement) roughCanvas.draw(element.roughElement);
            break;
        case ElementType.Pencil:
        case ElementType.Eraser:
            if (!element.points || !element.size) return;
            const denormalizedPoints = element.points.map(point => ({
                x: point.x * canvasWidth,
                y: point.y * canvasHeight
            }));

            const stroke = getSvgPathFromStroke(getStroke(denormalizedPoints, {
                size: (element.size * canvasWidth)
            }));
            context.fillStyle = element.color;
            context.fill(new Path2D(stroke));
            break;
        case ElementType.Text:
            context.textBaseline = "top";
            context.font = "2.4rem sans-serif";
            context.fillStyle = element.color;
            if (!element.point || !element.text) return;
            // Convert normalized coordinates to pixel values
            const pixelX = element.point.x * canvasWidth;
            const pixelY = element.point.y * canvasHeight;

            // Split the text by newline character and draw each line separately
            const lines = element.text.split('\n');
            const lineHeight = 24; // Line height in pixels
            for (let i = 0; i < lines.length; i++) {
                context.fillText(lines[i], pixelX, pixelY + (i * lineHeight));
            }
            break;
        default:
            break;
    }
};


const getNormalizedCanvasMouseCoordinates = (canvas: HTMLCanvasElement, mouse: Point, canvasWidth: number, canvasHeight: number) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvasWidth / rect.width;
    const scaleY = canvasHeight / rect.height;
    const clientX = (mouse.x - rect.left) * scaleX;
    const clientY = (mouse.y - rect.top) * scaleY;
    // Normalize the coordinates
    const normalizedX = clientX / canvasWidth;
    const normalizedY = clientY / canvasHeight;
    return {clientX: normalizedX, clientY: normalizedY};
};

//--------------------------------------------------------------------------------------------------------------------
const isElementType = (tool: Tool): tool is ElementType => tool in ElementType;

//----------------------------------------------------------------------------------------------------------------------

function DrawingComponent({initialActions = [], isEditable, onActionsChange, onSave, onCancel}: {
    initialActions?: DrawingAction[],
    isEditable: boolean,
    onActionsChange?: (newActions: DrawingAction[]) => void,
    onSave?: () => void
    onCancel?: () => void
}) {

    const nextIdRef = useRef(0);
    const [elements, pushAction, undo, redo, onCanvasResize] = useActions(initialActions, nextIdRef, isEditable, onActionsChange ?? (() => {
    }))

    const [drawnElements, setDrawnElements] = useState<DrawingElement[]>(elements)


    const [state, setState] = useState(State.None);

    const [tool, setTool] = useState<Tool>(ElementType.Pencil);

    const [selection, setSelection] = useState<{
        element: DrawingElement,
        offsetPoints?: Point[],
        offsetPoint?: Point,
        position?: Position
    } | null>(null);


    const [pencilSize, setPencilSize] = useState<number>(6);

    const [canvasSize, setCanvasSize] = useState({width: 1280, height: 720});
    const [fill, setFill] = useState<boolean>(false);
    const [selectedColor, setSelectedColor] = useState<number>(0);

    const initialColors = [
        '#000000', '#808080', '#C0C0C0', '#FFFFFF',
        '#F2E72B', '#F69B24', '#DC3624', '#C42D41',
        '#6E4C7C', '#3C2180', '#4A6A9C', '#124291',
        '#2A8C9E', '#275A5C', '#25793E', '#93B332',
    ];
    const [colors, setColors] = useState<string[]>([...initialColors]);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const textAreaRef = useRef<HTMLTextAreaElement>(null);
    const [showColorPicker, setShowColorPicker] = useState<boolean>(false);
    const colorPickerButtonRef = useRef<HTMLButtonElement>(null);
    const colorPickerContainerRef = useRef<HTMLDivElement>(null);

    const updateCanvasSize = () => {
        // Calculate the new canvas size
        let newWidth = window.innerWidth;
        let newHeight = window.innerWidth * (9 / 16);

        // If the calculated height is more than the window height, adjust the width based on the height
        if (newHeight > window.innerHeight) {
            newHeight = window.innerHeight;
            newWidth = window.innerHeight * (16 / 9);
            // Update the canvas size state
        }
        setCanvasSize({width: newWidth, height: newHeight});

    };

    useEffect(() => {
        updateCanvasSize();
        window.addEventListener('resize', updateCanvasSize);

        // Clean up the event listener when the component unmounts

        document.body.style.backgroundColor = 'white';
        const canvas = canvasRef.current;
        if (!canvas) return;
        redraw(canvas);

        return () => {
            window.removeEventListener('resize', updateCanvasSize);
        }
    }, [canvasRef]); // Empty dependency array means this effect runs once on mount and clean up on unmount


    useEffect(() => {
        const canvas = canvasRef.current;
        if (canvas) {
            // Set the canvas dimensions
            canvas.width = canvasSize.width;
            canvas.height = canvasSize.height;
        }
        onCanvasResize();
    }, [canvasSize, canvasRef]);


    const redraw = (canvas: HTMLCanvasElement) => {
        const context = canvas.getContext('2d')!;
        const roughCanvas = rough.canvas(canvas);

        // Set the size of the drawing surface to match the size of the element
        // canvas.height = 720;

        // Add the event listener when the component mounts
        context.clearRect(0, 0, canvasSize.width, canvasSize.height);

        context.save();

        drawnElements.forEach(element => {
            if (state === State.Writing && selection?.element.id === element.id) return;
            drawElement(roughCanvas, context, element, canvasSize.width, canvasSize.height)
        })

        context.restore();
    };

    useLayoutEffect(() => {
        if (!drawnElements) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        redraw(canvas);

    }, [canvasRef, canvasSize, drawnElements, state, selection]);

    useEffect(() => {

    }, [selectedColor]);

// Always keep the ref updated with the latest state

    useEffect(() => {
        setDrawnElements(elements)
    }, [elements]);


    isEditable && useEffect(() => {
        const canvas = canvasRef.current;
        if (canvas) {
            switch (tool) {
                case AltTool.Selection:
                    break;
                case ElementType.Line:
                case ElementType.Rectangle:
                case ElementType.Ellipse :
                case ElementType.Pencil:
                    canvas.style.cursor = "crosshair";
                    break;
                case ElementType.Eraser:
                    canvas.style.cursor = 'url(./cursors/eraser.cur), auto'
                    break;
                case ElementType.Text:
                    canvas.style.cursor = 'text';
                    break;
                default:
                    canvas.style.cursor = "auto";
                    break;
            }
        }
    }, [tool, state]);




    useEffect(() => {
        window.addEventListener('mouseup', handleMouseUp);
        window.addEventListener('mousemove', handleMouseMove);

        // Clean up the event listener when the component unmounts
        return () => {
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('mousemove', handleMouseMove);
        };

    }, [
        canvasRef,
        canvasSize,
        drawnElements,
        selection,
        state,
        tool,
        selectedColor,
        pencilSize,
        fill,
    ]); // Empty dependency array means this effect runs once on mount and clean up on unmount


    isEditable && useEffect(() => {
        const undoRedoFunction = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && (event.key === "z" || event.key === "Z")) {
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
            if (state === State.Writing) {
                textArea.focus();
            }
        }
    }, [state, selection]);


//--------------------------------------------------------------------------------------------------------------------


    const handleMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isEditable || !canvasRef.current) return;
        const {clientX, clientY} = getNormalizedCanvasMouseCoordinates(canvasRef.current, {
            x: event.clientX,
            y: event.clientY
        }, canvasSize.width, canvasSize.height);
        if (tool === AltTool.Selection) {
            const clickedElement = getElementAtPosition(clientX, clientY, drawnElements, canvasRef.current, canvasSize.width, canvasSize.height);
            if (clickedElement?.element && clickedElement.position !== null && clickedElement.element.type !== ElementType.Eraser) {
                const {element, position} = clickedElement;
                // setElements(prevState => prevState ?? prevState);

                if (position === Position.Inside) {
                    if (element.coordinates) {
                        const offsetPoint: Point = {
                            x: clientX - element.coordinates.x1,
                            y: clientY - element.coordinates.y1
                        }
                        setSelection({element, offsetPoint});
                    } else if (element.points) {
                        const offsetPoints: Point[] = element.points.map(point => ({
                            x: clientX - point.x,
                            y: clientY - point.y
                        }));
                        setSelection({element, offsetPoints});
                    } else if (element.point) {
                        const offsetPoint: Point = {
                            x: clientX - element.point.x,
                            y: clientY - element.point.y
                        }
                        setSelection({element, offsetPoint});
                    }
                    setState(State.Moving);
                } else {
                    setSelection({element, position});
                    setState(State.Resizing);
                }
            }
        } else if (isElementType(tool)) {
            const id = nextIdRef.current;
            nextIdRef.current++;
            const index = drawnElements.length;
            let size;
            if (tool === ElementType.Pencil || tool === ElementType.Eraser) size = pencilSize / canvasSize.width;

            let element: DrawingElement = {
                index,
                id,
                type: tool,
                color: tool === ElementType.Eraser ? document.body.style.backgroundColor : colors[selectedColor],
                size
            };

            if (tool === ElementType.Rectangle || tool === ElementType.Line || tool === ElementType.Ellipse) {
                element = updateShapeElement(element, {
                    x1: clientX,
                    y1: clientY,
                    x2: clientX,
                    y2: clientY
                }, canvasSize.height, canvasSize.width, fill ? true : undefined);

            } else if (tool === ElementType.Text) {
                element = updateTextElement(element, {x: event.clientX, y: event.clientY}, "");
            } else if (tool === ElementType.Pencil || tool === ElementType.Eraser) {
                element = updatePencilElement(element, [{x: clientX, y: clientY}]);
            }

            setDrawnElements([...drawnElements, element]);
            setSelection({element});
            const newState = tool === ElementType.Text ? State.Writing : State.Drawing;
            setState(newState);
        }
    };

//--------------------------------------------------------------------------------------------------------------------

    const handleMouseMove = (event: MouseEvent) => {
        if (!isEditable || !canvasRef.current) return;
        const {clientX, clientY} = getNormalizedCanvasMouseCoordinates(canvasRef.current, {
            x: event.clientX,
            y: event.clientY
        }, canvasSize.width, canvasSize.height);
        if (tool === AltTool.Selection) {
            const hoveredElement = getElementAtPosition(clientX, clientY, drawnElements, canvasRef.current, canvasSize.width, canvasSize.height);
            if (hoveredElement?.element.type !== ElementType.Eraser) {
                canvasRef.current.style.cursor = (hoveredElement && hoveredElement.position !== null) ? cursorForPosition(hoveredElement.position) : "default";
            } else {
                canvasRef.current.style.cursor = "default";
            }
        }
        if (state === State.None) return;
        if (selection) {
            let updatedElement;
            const index = selection?.element.index;
            const element = drawnElements[index]
            const selectedElement = selection.element;

            if (state === State.Drawing) {
                if (element.coordinates) {
                    const {x1, y1} = element.coordinates;
                    updatedElement = updateShapeElement(element, {
                        x1,
                        y1,
                        x2: clientX,
                        y2: clientY
                    }, canvasSize.height, canvasSize.width, undefined);
                } else if (element.points) {
                    updatedElement = updatePencilElement(element, [...(element.points), {
                        x: clientX,
                        y: clientY
                    }]);
                }
            } else if (state === State.Writing) {
                updatedElement = updateTextElement(selectedElement, {x: event.clientX, y: event.clientY});

            } else {
                if (state === State.Moving) {
                    if ((selectedElement.type === ElementType.Pencil || selectedElement.type === ElementType.Eraser)
                        && selection.offsetPoints && selectedElement.points) {
                        const newPoints: Point[] = selectedElement.points.map((point, index: number) => {
                            if (!selection.offsetPoints) return point;
                            return ({
                                x: clientX - selection.offsetPoints[index].x,
                                y: clientY - selection.offsetPoints[index].y,
                            });
                        });
                        updatedElement = updatePencilElement(selection.element, newPoints);
                    } else if (selection.offsetPoint && selectedElement.coordinates) {

                        const width = selectedElement.coordinates.x2 - selectedElement.coordinates.x1;
                        const height = selectedElement.coordinates.y2 - selectedElement.coordinates.y1;
                        const newX1 = clientX - selection.offsetPoint.x;
                        const newY1 = clientY - selection.offsetPoint.y;
                        const newCoordinates: Coordinates = {
                            x1: newX1,
                            y1: newY1,
                            x2: newX1 + width,
                            y2: newY1 + height
                        };
                        updatedElement = updateShapeElement(element, newCoordinates, canvasSize.height, canvasSize.width);
                    } else if (selection.offsetPoint && selectedElement.point) {
                        const newPoint: Point = {
                            x: clientX - selection.offsetPoint.x,
                            y: clientY - selection.offsetPoint.y
                        };
                        updatedElement = updateTextElement(selectedElement, newPoint, selectedElement.text);
                    }
                } else if (state === State.Resizing && selectedElement.coordinates && selection.position !== undefined) {
                    const newCoordinates = resizedCoordinates(clientX, clientY, selection.position, selectedElement.coordinates)!;
                    updatedElement = updateShapeElement(selectedElement, newCoordinates, canvasSize.height, canvasSize.width);
                }
            }
            if (updatedElement) {
                const updatedElements = [...drawnElements]
                updatedElements[index] = updatedElement;
                setDrawnElements(updatedElements);
            }
        }
    }

//----------------------------------------------------------------------------------------------------------------------

    const handleMouseUp = () => {
        if (!isEditable || !canvasRef.current) return;
        if (!canvasRef.current) return;
        if (selection) {
            const index = selection.element.index;
            const element = drawnElements[index];
            if ((state === State.Drawing || state === State.Resizing) && (element.type === ElementType.Line || element.type == ElementType.Rectangle)) {
                const newCoordinates = adjustShapeElementCoordinates(element);
                const updatedElement = updateShapeElement(element, newCoordinates, canvasSize.height, canvasSize.width);
                const updatedElements = [...drawnElements];
                updatedElements[index] = updatedElement;
            }
            if (state === State.Drawing) {
                let drawingElement: DrawingElement | undefined;
                switch (element.type) {
                    case ElementType.Rectangle:
                    case ElementType.Line:
                    case ElementType.Ellipse:
                        drawingElement = {
                            index: element.index,
                            id: element.id,
                            coordinates: element.coordinates,
                            type: element.type,
                            color: element.color,
                            fill: element.fill
                        }
                        break;
                    case ElementType.Pencil:
                    case ElementType.Eraser:
                        drawingElement = {
                            index: element.index,
                            id: element.id,
                            points: element.points,
                            type: element.type,
                            color: element.color,
                            size: element.size,
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

            } else if (state === State.Resizing || state === State.Moving) {
                const oldElement = elements[index]
                switch (element.type) {
                    case ElementType.Rectangle:
                    case ElementType.Line:
                    case ElementType.Ellipse:
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
                    case ElementType.Pencil:
                    case ElementType.Eraser:
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
                    case ElementType.Text:
                        if (!element.point || !oldElement.point) return;
                        const deltaPoint: Point = {
                            x: element.point.x - oldElement.point.x,
                            y: element.point.y - oldElement.point.y
                        };
                        pushAction({
                            elementId: element.id,
                            type: ActionType.UPDATE,
                            point: deltaPoint
                        })
                        break;
                }
            } else if (state === State.Writing) {
                textAreaRef.current?.focus();
                textAreaRef.current?.addEventListener("blur", handleWritingEnd);
            }
        }

        if (state !== State.Writing) {
            setState(State.None);
            setSelection(null);
        }
    }

//----------------------------------------------------------------------------------------------------------------------

    const handleToolChange = (newTool: Tool) => {
        setTool(newTool);
    };

//----------------------------------------------------------------------------------------------------------------------

    const handleWritingEnd = () => {
        textAreaRef.current?.removeEventListener("blur", handleWritingEnd)

        if (canvasRef.current && selection && selection.element.type === ElementType.Text && textAreaRef.current) {
            const rect = textAreaRef.current.getBoundingClientRect();
            const {clientX, clientY} = getNormalizedCanvasMouseCoordinates(canvasRef.current, {
                x: rect.left,
                y: rect.top
            }, canvasSize.width, canvasSize.height)
            const updatedElement = updateTextElement(selection.element, {
                x: clientX,
                y: clientY
            }, textAreaRef.current?.value);
            const drawingElement: DrawingElement = {...updatedElement};
            pushAction({
                elementId: selection.element.id,
                type: ActionType.DRAW,
                element: drawingElement
            })
        }
        setState(State.None);
        setSelection(null);
    };

    const resetColorPicker = (event: MouseEvent) => {
        // reset the color picker if we didn't click on its parent
        if (colorPickerContainerRef.current && colorPickerButtonRef.current && !colorPickerContainerRef.current.contains(event.target as Node) && !colorPickerButtonRef.current.contains(event.target as Node)) {
            setShowColorPicker(false);
            window.removeEventListener('mousedown', resetColorPicker)
        }
    };

    const handleShowColorPicker = () => {
        setShowColorPicker(false);
        window.removeEventListener('mousedown', resetColorPicker)

        // add new color to the color array
        setSelectedColor(colors.length);
        const newColor = '#' + Math.floor(Math.random() * 16777215).toString(16);
        setColors([...colors, newColor]);
        setSelectedColor(colors.length);
        setTimeout(() => {
            setShowColorPicker(true);

            window.addEventListener('mousedown', resetColorPicker)
        }, 10);
    };

// ---------------------------------------------------------------------------------------------------------------------
    return (
        <div className={"drawing-page"}>
            {isEditable &&
                <>
                    <div className={"tools-container"}>
                        <div>
                            <FontAwesomeIcon
                                size={"2x"}
                                icon={faHand}
                                className={`icon ${tool === AltTool.Selection? 'selected-icon' : ''}`}
                                onClick={() => handleToolChange(AltTool.Selection)}
                            />
                        </div>
                        <div>
                            <FontAwesomeIcon
                                size={"2x"}
                                icon={faMinus}
                                className={`icon ${tool === ElementType.Line ? 'selected-icon' : ''}`}
                                onClick={() => handleToolChange(ElementType.Line)}
                            />
                        </div>
                        <div>
                            <FontAwesomeIcon
                                size={"2x"}
                                icon={faSquare}
                                className={`icon ${tool === ElementType.Rectangle ? 'selected-icon' : ''}`}
                                onClick={() => handleToolChange(ElementType.Rectangle)}
                            />
                        </div>
                        <div>
                            <FontAwesomeIcon
                                size={"2x"}
                                icon={faCircle}
                                className={`icon ${tool === ElementType.Ellipse ? 'selected-icon' : ''}`}
                                onClick={() => handleToolChange(ElementType.Ellipse)}
                            />
                        </div>
                        <div>
                            <FontAwesomeIcon
                                size={"2x"}
                                icon={faFont}
                                className={`icon ${tool === ElementType.Text ? 'selected-icon' : ''}`}
                                onClick={() => handleToolChange(ElementType.Text)}
                            />
                        </div>
                        <div>
                            <FontAwesomeIcon
                                size={"2x"}
                                icon={faPencilAlt}
                                className={`icon ${tool === ElementType.Pencil ? 'selected-icon' : ''}`}
                                onClick={() => handleToolChange(ElementType.Pencil)}
                            />
                        </div>
                        <div>
                            <FontAwesomeIcon
                                size={"2x"}
                                icon={faEraser}
                                className={`icon ${tool === ElementType.Eraser ? 'selected-icon' : ''}`}
                                onClick={() => handleToolChange(ElementType.Eraser)}
                            />
                        </div>
                    </div>

                    <div className={"settings-container"}>
                        <div>
                            <input type="checkbox"
                                   id="fill"
                                   disabled={tool !== ElementType.Rectangle && tool !== ElementType.Ellipse}
                                   checked={fill}
                                   onChange={(event) => setFill(event.currentTarget.checked)}/>
                            <label htmlFor="Fill">Fill</label>
                        </div>

                        <div>
                            <input id="pencilSize" type="range" min="1" max="100" value={pencilSize} onChange={(event) => setPencilSize(parseInt(event.currentTarget.value))}/>
                            {tool === ElementType.Text && state == State.Writing && selection && selection.element.point &&
                                <textarea
                                    ref={textAreaRef}
                                    autoFocus={true}
                                    style={{
                                        position: 'absolute',
                                        left: `${selection.element.point.x}px`,
                                        top: `${selection.element.point.y}px`,
                                        fontSize: '2.4rem',
                                        backgroundColor: 'transparent',
                                        border: 'none',
                                        color: colors[selectedColor],
                                    }}
                                    defaultValue={selection.element.text}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleWritingEnd();
                                        }
                                    }}
                                />
                            }
                        </div>
                    </div>

                    <div className={"colors-container"}>
                        {colors.map((c, index) => {
                            return (
                                    <button key={index} style={{
                                        backgroundColor: c,
                                        boxShadow: selectedColor === index ? '0 0 0 0.1rem #3C78D8, 0 0 0 0.1rem #3C78D8' : '0 0 0 0.1rem #000, 0 0 0 0.1rem #fff'
                                    }}
                                            className={"color-button"}
                                            onClick={() => {
                                                setSelectedColor(index)
                                            }}/>
                            );
                        })}
                        <button ref={colorPickerButtonRef} className={"color-button"}
                                onClick={handleShowColorPicker}>+
                        </button>

                        {showColorPicker && (
                            <div ref={colorPickerContainerRef}
                                 style={{
                                     position: 'fixed',
                                     left: colorPickerButtonRef.current ? `${colorPickerButtonRef.current?.offsetLeft + colorPickerButtonRef.current?.offsetWidth / 2}px` : '0',
                                     top: colorPickerButtonRef.current ? `${colorPickerButtonRef.current?.offsetTop + colorPickerButtonRef.current?.offsetHeight / 2}px` : '0',
                                     zIndex: 2
                                 }}>
                                <ChromePicker color={colors[colors.length - 1]} disableAlpha={true}
                                              onChange={(event) => {
                                                  const updatedColors = [...colors];
                                                  updatedColors[selectedColor] = event.hex;
                                                  setColors(updatedColors);
                                              }}/>
                            </div>
                        )}

                        {selectedColor >= initialColors.length &&
                            <button className={"color-button"} onClick={() => {
                                setShowColorPicker(false)
                                const updatedColors = [...colors];
                                updatedColors.splice(selectedColor, 1);
                                setColors(updatedColors);
                                setSelectedColor(selectedColor - 1);
                            }}>-</button>
                        }
                    </div>
                </>
            }
            <div className={"canvas-container"}>
                <canvas ref={canvasRef}
                        id="canvas"
                        onMouseDown={handleMouseDown}>
                    Canvas
                </canvas>

            </div>
            {isEditable &&
                <>
                    <div>
                        <button onClick={undo}>Undo</button>
                        <button onClick={redo}>Redo</button>
                    </div>
                    <div>
                    <button onClick={onCancel}>Cancel</button>
                    <button onClick={onSave}>Save Drawing</button>
                    </div>

                </>
            }
        </div>

    );
}

export default DrawingComponent;
