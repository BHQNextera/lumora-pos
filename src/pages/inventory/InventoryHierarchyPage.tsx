import {
    useEffect,
    useMemo,
    useState,
} from "react";

import type {
    InventoryHierarchyLevel,
} from "../../models/inventory/InventoryHierarchy";
import {
    createInventoryHierarchyNode,
    getInventoryHierarchyNodes,
    hydrateInventoryHierarchy,
    setInventoryHierarchyNodeActive,
    subscribeInventoryHierarchy,
} from "../../models/inventory/InventoryHierarchyRepository";

import "./inventory-hierarchy-page.css";

const levelLabels: Record<
    InventoryHierarchyLevel,
    string
> = {
    department: "מחלקה",
    category: "קטגוריה",
    subcategory: "תת־קטגוריה",
};

function InventoryHierarchyPage() {
    const [revision, setRevision] =
        useState(0);
    const [level, setLevel] =
        useState<InventoryHierarchyLevel>(
            "department",
        );
    const [name, setName] =
        useState("");
    const [parentId, setParentId] =
        useState("");
    const [error, setError] =
        useState<string | null>(null);

    useEffect(() => {
        let alive = true;

        const unsubscribe =
            subscribeInventoryHierarchy(
                () => {
                    if (alive) {
                        setRevision(
                            (current) =>
                                current + 1,
                        );
                    }
                },
            );

        hydrateInventoryHierarchy()
            .then(() => {
                if (alive) {
                    setRevision(
                        (current) =>
                            current + 1,
                    );
                }
            })
            .catch((reason) => {
                if (alive) {
                    setError(
                        reason instanceof Error
                            ? reason.message
                            : "טעינת ההיררכיה נכשלה.",
                    );
                }
            });

        return () => {
            alive = false;
            unsubscribe();
        };
    }, []);

    const nodes = useMemo(
        () =>
            getInventoryHierarchyNodes(),
        [revision],
    );

    const departments =
        nodes.filter(
            (node) =>
                node.level ===
                    "department" &&
                node.isActive,
        );

    const categories =
        nodes.filter(
            (node) =>
                node.level === "category" &&
                node.isActive,
        );

    const parentOptions =
        level === "category"
            ? departments
            : level === "subcategory"
                ? categories
                : [];

    const parentName = (
        id?: string,
    ) =>
        id
            ? nodes.find(
                  (node) => node.id === id,
              )?.name ?? "—"
            : "—";

    const changeLevel = (
        next: InventoryHierarchyLevel,
    ) => {
        setLevel(next);
        setParentId("");
        setError(null);
    };

    const add = () => {
        try {
            createInventoryHierarchyNode({
                level,
                name,
                parentId:
                    level === "department"
                        ? undefined
                        : parentId,
            });
            setName("");
            setParentId("");
            setError(null);
        }
        catch (reason) {
            setError(
                reason instanceof Error
                    ? reason.message
                    : "שמירת ההיררכיה נכשלה.",
            );
        }
    };

    const toggle = (
        nodeId: string,
        isActive: boolean,
    ) => {
        try {
            setInventoryHierarchyNodeActive(
                nodeId,
                isActive,
            );
            setError(null);
        }
        catch (reason) {
            setError(
                reason instanceof Error
                    ? reason.message
                    : "עדכון ההיררכיה נכשל.",
            );
        }
    };

    return (
        <section
            className="inventory-hierarchy"
            dir="rtl"
        >
            <header className="inventory-hierarchy__header">
                <div>
                    <p className="inventory-hierarchy__eyebrow">
                        LUMORA INVENTORY
                    </p>
                    <h1>היררכיית פריטים</h1>
                    <p>
                        ניהול מחלקות, קטגוריות ותתי־קטגוריות לשיוך אחיד בפריטי המלאי.
                    </p>
                </div>
            </header>

            <div className="inventory-hierarchy__create-card">
                <div className="inventory-hierarchy__field">
                    <span>רמה</span>
                    <select
                        value={level}
                        onChange={(event) =>
                            changeLevel(
                                event.target.value as InventoryHierarchyLevel,
                            )
                        }
                    >
                        <option value="department">
                            מחלקה
                        </option>
                        <option value="category">
                            קטגוריה
                        </option>
                        <option value="subcategory">
                            תת־קטגוריה
                        </option>
                    </select>
                </div>

                {level !== "department" && (
                    <div className="inventory-hierarchy__field">
                        <span>
                            {level === "category"
                                ? "מחלקת אב"
                                : "קטגוריית אב"}
                        </span>
                        <select
                            value={parentId}
                            onChange={(event) =>
                                setParentId(
                                    event.target.value,
                                )
                            }
                        >
                            <option value="">
                                בחר
                            </option>
                            {parentOptions.map(
                                (node) => (
                                    <option
                                        key={node.id}
                                        value={node.id}
                                    >
                                        {node.name}
                                    </option>
                                ),
                            )}
                        </select>
                    </div>
                )}

                <div className="inventory-hierarchy__field inventory-hierarchy__field--name">
                    <span>שם *</span>
                    <input
                        value={name}
                        onChange={(event) =>
                            setName(
                                event.target.value,
                            )
                        }
                        placeholder={`שם ${levelLabels[level]}`}
                    />
                </div>

                <button
                    type="button"
                    className="inventory-hierarchy__add"
                    onClick={add}
                >
                    + הוסף
                </button>
            </div>

            {error && (
                <div className="inventory-hierarchy__error">
                    {error}
                </div>
            )}

            <div className="inventory-hierarchy__table-wrap">
                <table className="inventory-hierarchy__table">
                    <thead>
                        <tr>
                            <th>רמה</th>
                            <th>שם</th>
                            <th>אב</th>
                            <th>סטטוס</th>
                            <th>פעולה</th>
                        </tr>
                    </thead>
                    <tbody>
                        {nodes.map((node) => (
                            <tr key={node.id}>
                                <td>
                                    {levelLabels[node.level]}
                                </td>
                                <td>
                                    <strong>
                                        {node.name}
                                    </strong>
                                </td>
                                <td>
                                    {parentName(
                                        node.parentId,
                                    )}
                                </td>
                                <td>
                                    <span
                                        className={
                                            node.isActive
                                                ? "inventory-hierarchy__status inventory-hierarchy__status--active"
                                                : "inventory-hierarchy__status"
                                        }
                                    >
                                        {node.isActive
                                            ? "פעיל"
                                            : "לא פעיל"}
                                    </span>
                                </td>
                                <td>
                                    <button
                                        type="button"
                                        className="inventory-hierarchy__secondary"
                                        onClick={() =>
                                            toggle(
                                                node.id,
                                                !node.isActive,
                                            )
                                        }
                                    >
                                        {node.isActive
                                            ? "השבתה"
                                            : "הפעלה"}
                                    </button>
                                </td>
                            </tr>
                        ))}

                        {nodes.length === 0 && (
                            <tr>
                                <td
                                    colSpan={5}
                                    className="inventory-hierarchy__empty"
                                >
                                    עדיין לא הוגדרה היררכיה.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </section>
    );
}

export default InventoryHierarchyPage;
