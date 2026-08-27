import {
  useEffect,
  useMemo,
  useState,
} from "react";
import type {
  ReactNode,
} from "react";

import LanguageSettingsPanel from "../../components/settings/LanguageSettingsPanel";

import {
  getActiveBusinessConfiguration,
  getActiveBusinessOperatingProfile,
  getActiveRegisterProfile,
  saveActiveBusinessConfiguration,
  subscribeActiveBusinessConfiguration,
} from "../../config/ActiveBusinessConfiguration";
import {
  getRegisterPrinterConfig,
  saveRegisterPrinterPaperFormat,
  subscribeRegisterPrinterConfig,
} from "../../config/RegisterPrinterConfig";
import {
  getDocumentSettings,
  saveDocumentSettings,
  subscribeDocumentSettings,
} from "../../config/DocumentSettings";
import {
  getDocumentFooterSettings,
  saveDocumentFooterSettings,
  subscribeDocumentFooterSettings,
} from "../../config/DocumentFooterSettings";
import type {
  Employee,
  EmployeeRole,
} from "../../models/employee/Employee";
import {
  createEmployee,
  getEmployees,
  setEmployeeActive,
  subscribeEmployees,
  updateEmployee,
} from "../../models/employee/EmployeeRepository";
import {
  isPaymentMethodRuntimeAvailable,
  movePaymentMethod,
  resolvePaymentMethods,
  setPaymentMethodActive,
  subscribePaymentMethodConfiguration,
  type PaymentMethodCode,
  type PaymentMethodKind,
} from "../../models/PaymentMethod";
import {
  getActiveBranchTaxProfile,
  getTaxPolicy,
  saveBranchTaxProfile,
  saveTaxPolicy,
  subscribeTaxPolicy,
  type BranchTaxProfileId,
} from "../../models/tax/TaxPolicy";
import {
  getReturnPolicy,
  saveReturnPolicy,
  subscribeReturnPolicy,
  type WithoutDocumentRefundMode,
} from "../../config/ReturnPolicy";
import {
  getCustomerCreditPolicy,
  saveCustomerCreditPolicy,
  subscribeCustomerCreditPolicy,
} from "../../config/CustomerCreditPolicy";
import {
  getBusinessIdentitySettings,
  saveBusinessIdentitySettings,
  subscribeBusinessIdentitySettings,
} from "../../config/BusinessIdentitySettings";
import {
  getRegisterLocalSettings,
  saveRegisterLocalSettings,
  subscribeRegisterLocalSettings,
} from "../../config/RegisterLocalSettings";

import "./settings-page.css";

type SettingsSectionId =
  | "business"
  | "register"
  | "employees"
  | "attendance"
  | "printer"
  | "documents"
  | "footer"
  | "payments"
  | "tax"
  | "returns"
  | "customers"
  | "display";

type SettingsSection = {
  id: SettingsSectionId;
  label: string;
  icon: string;
  description: string;
};

const sections: SettingsSection[] = [
  {
    id: "business",
    label: "עסק וסניף",
    icon: "◇",
    description: "זהות העסק והסניף שמפעילים את Lumora.",
  },
  {
    id: "register",
    label: "קופה",
    icon: "▣",
    description: "זהות הקופה והגדרות ההפעלה המקומיות.",
  },
  {
    id: "employees",
    label: "עובדים",
    icon: "♙",
    description: "הקמת עובדים, תפקידים וסטטוס פעילות.",
  },
  {
    id: "attendance",
    label: "נוכחות",
    icon: "◷",
    description: "מדיניות נוכחות וסף שעות יומי.",
  },
  {
    id: "printer",
    label: "מדפסת",
    icon: "▤",
    description: "מדפסת תרמית ורוחב נייר 58/80 מ״מ.",
  },
  {
    id: "documents",
    label: "מסמכים",
    icon: "▥",
    description: "מסמכי מכירה, החזרה והחלפה.",
  },
  {
    id: "footer",
    label: "פוטר למסמכים",
    icon: "≡",
    description: "מידע קבוע שיודפס בתחתית המסמך.",
  },
  {
    id: "payments",
    label: "תשלומים",
    icon: "₪",
    description: "אמצעי תשלום פעילים וסדר הופעה.",
  },
  {
    id: "tax",
    label: "מע״מ ומחירים",
    icon: "%",
    description: "מדיניות מס ותצוגת מחירים.",
  },
  {
    id: "returns",
    label: "החזרות והחלפות",
    icon: "↔",
    description: "כללי החזרה, החלפה ומסמך מקור.",
  },
  {
    id: "customers",
    label: "לקוחות והקפה",
    icon: "◎",
    description: "מדיניות לקוחות, זיהוי והקפה.",
  },
  {
    id: "display",
    label: "\u05e9\u05e4\u05d5\u05ea",
    icon: "A",
    description: "\u05e9\u05e4\u05ea \u05d4\u05de\u05de\u05e9\u05e7 \u05d5\u05d7\u05d1\u05d9\u05dc\u05d5\u05ea \u05e9\u05e4\u05d4 \u05de\u05e7\u05d5\u05de\u05d9\u05d5\u05ea.",
  },
];

type EmployeeEditorState = {
  mode: "create" | "edit";
  employeeId?: string;
  name: string;
  code: string;
  roles: EmployeeRole[];
  isActive: boolean;
};

const emptyEmployeeEditor:
  EmployeeEditorState = {
  mode: "create",
  name: "",
  code: "",
  roles: [
    "seller",
  ],
  isActive: true,
};

function getEmployeeErrorMessage(
  error: unknown,
) {
  if (!(error instanceof Error)) {
    return "לא ניתן לשמור את העובד.";
  }

  switch (error.message) {
    case "EMPLOYEE_NAME_REQUIRED":
      return "יש להזין שם עובד.";

    case "EMPLOYEE_CODE_REQUIRED":
      return "יש להזין קוד עובד.";

    case "EMPLOYEE_ROLE_REQUIRED":
      return "יש לבחור לפחות תפקיד אחד.";

    case "EMPLOYEE_CODE_DUPLICATE":
      return "קוד העובד כבר קיים במערכת.";

    case "EMPLOYEE_NOT_FOUND":
      return "העובד לא נמצא.";

    default:
      return "לא ניתן לשמור את העובד.";
  }
}

function formatEmployeeNumber(
  value?: number,
) {
  return value
    ? String(value).padStart(
        4,
        "0",
      )
    : "—";
}

const paymentKindLabels:
  Record<
    PaymentMethodKind,
    string
  > = {
  cash:
    "מזומן",
  integrated:
    "משולב",
  recorded:
    "מתועד",
  stored_value:
    "יתרה / זיכוי",
};

const paymentMethodDescriptions:
  Record<
    PaymentMethodCode,
    string
  > = {
  cash:
    "תשלום מזומן מלא או חלקי והחזרת עודף.",
  card_terminal:
    "חיבור ישיר למסופון דורש Adapter של ספק סליקה ואינו זמין בפיילוט הנוכחי.",
  echo:
    "בקשת תשלום דיגיטלית דרך Echo.",
  bit:
    "תשלום Bit שמתועד בקופה.",
  paybox:
    "תשלום PayBox שמתועד בקופה.",
  bank_transfer:
    "העברה בנקאית עם אסמכתא לפי הצורך.",
  cheque:
    "תשלום בהמחאה.",
  external_credit:
    "חיוב שאושר במסוף חיצוני ומתועד ידנית עם אסמכתה.",
  credit_voucher:
    "מימוש שובר זיכוי קיים.",
  gift_card:
    "מימוש יתרת כרטיס מתנה.",
  store_credit:
    "תשלום בהקפה על חשבון הלקוח.",
  custom:
    "אמצעי תשלום תיעודי נוסף.",
};

const roleLabels = {
  seller: "מוכר",
  cashier: "קופאי",
  manager: "מנהל",
} as const;

function BooleanState({
  value,
  positive = "פעיל",
  negative = "לא פעיל",
}: {
  value: boolean;
  positive?: string;
  negative?: string;
}) {
  return (
    <span
      className={`settings-page__state ${
        value
          ? "settings-page__state--active"
          : ""
      }`}
    >
      <span aria-hidden="true" />
      {value ? positive : negative}
    </span>
  );
}

function SettingsToggle({
  checked,
  onChange,
  label,
  disabled = false,
}: {
  checked: boolean;
  onChange: (
    checked: boolean,
  ) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className={`settings-page__toggle ${
        checked
          ? "settings-page__toggle--on"
          : ""
      }`}
      aria-pressed={
        checked
      }
      aria-label={
        label
      }
      disabled={
        disabled
      }
      onClick={() =>
        onChange(
          !checked,
        )
      }
    >
      <span aria-hidden="true" />
      <b>
        {disabled
          ? "לא זמין"
          : checked
          ? "פעיל"
          : "כבוי"}
      </b>
    </button>
  );
}

function SettingRow({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <div className="settings-page__setting-row">
      <div className="settings-page__setting-copy">
        <strong>{label}</strong>
        {hint && <span>{hint}</span>}
      </div>

      <div className="settings-page__setting-value">
        {value}
      </div>
    </div>
  );
}

function SectionHeading({
  title,
  description,
  badge,
}: {
  title: string;
  description: string;
  badge?: string;
}) {
  return (
    <div className="settings-page__section-heading">
      <div>
        <span className="settings-page__eyebrow">
          LUMORA SETTINGS
        </span>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>

      {badge && (
        <span className="settings-page__section-badge">
          {badge}
        </span>
      )}
    </div>
  );
}

function SettingsPage() {
  const [
    activeSection,
    setActiveSection,
  ] = useState<SettingsSectionId>(
    "business",
  );

  const [
    activeConfigurationRevision,
    setActiveConfigurationRevision,
  ] =
    useState(0);

  useEffect(
    () =>
      subscribeActiveBusinessConfiguration(
        () =>
          setActiveConfigurationRevision(
            (current) =>
              current + 1,
          ),
      ),
    [],
  );

  const configuration =
    useMemo(
      () =>
        getActiveBusinessConfiguration(),
      [
        activeConfigurationRevision,
      ],
    );

  const profile =
    getActiveBusinessOperatingProfile();

  const register =
    getActiveRegisterProfile();

  const [
    registerLocalRevision,
    setRegisterLocalRevision,
  ] =
    useState(0);

  useEffect(
    () =>
      subscribeRegisterLocalSettings(
        () =>
          setRegisterLocalRevision(
            (current) =>
              current + 1,
          ),
      ),
    [],
  );

  const registerLocalSettings =
    useMemo(
      () =>
        getRegisterLocalSettings(
          register,
        ),
      [
        registerLocalRevision,
        configuration.storeCode,
        configuration.registerCode,
        register.hardware.scannerEnabled,
        register.hardware.paymentTerminalEnabled,
      ],
    );

  const [
    storeCodeDraft,
    setStoreCodeDraft,
  ] =
    useState(
      configuration.storeCode,
    );

  const [
    registerCodeDraft,
    setRegisterCodeDraft,
  ] =
    useState(
      configuration.registerCode,
    );

  const [
    registerIdentityError,
    setRegisterIdentityError,
  ] =
    useState("");

  useEffect(
    () => {
      setStoreCodeDraft(
        configuration.storeCode,
      );

      setRegisterCodeDraft(
        configuration.registerCode,
      );
    },
    [
      configuration.storeCode,
      configuration.registerCode,
    ],
  );

  const commitRegisterIdentity = (
    field:
      | "storeCode"
      | "registerCode",
    raw:
      string,
  ) => {
    if (
      configuration.source ===
      "nextera"
    ) {
      setRegisterIdentityError(
        "זהות הסניף והקופה מנוהלת על ידי Nextera ואינה ניתנת לשינוי מקומי.",
      );
      return;
    }

    const value =
      raw.trim();

    if (
      !/^\d{2,3}$/.test(
        value,
      )
    ) {
      setRegisterIdentityError(
        field ===
          "storeCode"
          ? "קוד סניף חייב להכיל 2–3 ספרות."
          : "קוד קופה חייב להכיל 2–3 ספרות.",
      );

      setStoreCodeDraft(
        configuration.storeCode,
      );

      setRegisterCodeDraft(
        configuration.registerCode,
      );
      return;
    }

    setRegisterIdentityError(
      "",
    );

    saveActiveBusinessConfiguration({
      ...configuration,
      [field]:
        value,
    });
  };

  const [
    businessIdentityRevision,
    setBusinessIdentityRevision,
  ] =
    useState(0);

  useEffect(
    () =>
      subscribeBusinessIdentitySettings(
        () =>
          setBusinessIdentityRevision(
            (current) =>
              current + 1,
          ),
      ),
    [],
  );

  const businessIdentity =
    useMemo(
      () =>
        getBusinessIdentitySettings(
          profile,
          configuration.storeCode,
        ),
      [
        businessIdentityRevision,
        configuration.storeCode,
        profile.identity.businessName,
        profile.identity.tradingName,
        profile.identity.branchName,
        profile.identity.businessNumber,
        profile.identity.vatNumber,
        profile.identity.phone,
        profile.identity.address,
      ],
    );

  const saveBusinessField = (
    patch: Parameters<
      typeof saveBusinessIdentitySettings
    >[0],
  ) => {
    saveBusinessIdentitySettings(
      patch,
      configuration.storeCode,
    );
  };

  const [
    printerRevision,
    setPrinterRevision,
  ] =
    useState(0);

  useEffect(
    () =>
      subscribeRegisterPrinterConfig(
        () =>
          setPrinterRevision(
            (current) =>
              current + 1,
          ),
      ),
    [],
  );

  const printer =
    useMemo(
      () =>
        getRegisterPrinterConfig(),
      [printerRevision],
    );

  const [
    documentRevision,
    setDocumentRevision,
  ] =
    useState(0);

  useEffect(
    () =>
      subscribeDocumentSettings(
        () =>
          setDocumentRevision(
            (current) =>
              current + 1,
          ),
      ),
    [],
  );

  const documentSettings =
    useMemo(
      () =>
        getDocumentSettings(),
      [documentRevision],
    );

  const [
    footerRevision,
    setFooterRevision,
  ] =
    useState(0);

  useEffect(
    () =>
      subscribeDocumentFooterSettings(
        () =>
          setFooterRevision(
            (current) =>
              current + 1,
          ),
      ),
    [],
  );

  const footerSettings =
    useMemo(
      () =>
        getDocumentFooterSettings(),
      [footerRevision],
    );

  const [
    employeeEditor,
    setEmployeeEditor,
  ] =
    useState<EmployeeEditorState | null>(
      null,
    );

  const [
    employeeEditorError,
    setEmployeeEditorError,
  ] =
    useState("");

  const [
    employeeRevision,
    setEmployeeRevision,
  ] =
    useState(0);

  useEffect(
    () =>
      subscribeEmployees(
        () =>
          setEmployeeRevision(
            (current) =>
              current + 1,
          ),
      ),
    [],
  );

  const employees =
    useMemo(
      () =>
        getEmployees(),
      [employeeRevision],
    );

  const activeEmployees =
    employees.filter(
      (employee) =>
        employee.isActive,
    );

  const openNewEmployee = () => {
    setEmployeeEditorError(
      "",
    );

    setEmployeeEditor({
      ...emptyEmployeeEditor,
      roles: [
        ...emptyEmployeeEditor.roles,
      ],
    });
  };

  const openEmployeeEditor = (
    employee:
      Employee,
  ) => {
    setEmployeeEditorError(
      "",
    );

    setEmployeeEditor({
      mode:
        "edit",
      employeeId:
        employee.id,
      name:
        employee.name,
      code:
        employee.code ?? "",
      roles: [
        ...employee.roles,
      ],
      isActive:
        employee.isActive,
    });
  };

  const toggleEmployeeRole = (
    role:
      EmployeeRole,
  ) => {
    setEmployeeEditor(
      (current) => {
        if (!current) {
          return current;
        }

        const hasRole =
          current.roles.includes(
            role,
          );

        return {
          ...current,
          roles:
            hasRole
              ? current.roles.filter(
                  (currentRole) =>
                    currentRole !==
                    role,
                )
              : [
                  ...current.roles,
                  role,
                ],
        };
      },
    );
  };

  const saveEmployee = () => {
    if (!employeeEditor) {
      return;
    }

    setEmployeeEditorError(
      "",
    );

    try {
      const input = {
        name:
          employeeEditor.name,
        code:
          employeeEditor.code,
        roles:
          employeeEditor.roles,
        isActive:
          employeeEditor.isActive,
      };

      if (
        employeeEditor.mode ===
          "edit" &&
        employeeEditor.employeeId
      ) {
        updateEmployee(
          employeeEditor.employeeId,
          input,
        );
      }
      else {
        createEmployee(
          input,
        );
      }

      setEmployeeEditor(
        null,
      );
    }
    catch (error) {
      setEmployeeEditorError(
        getEmployeeErrorMessage(
          error,
        ),
      );
    }
  };

  const [
    taxRevision,
    setTaxRevision,
  ] =
    useState(0);

  const [
    taxRateDraft,
    setTaxRateDraft,
  ] =
    useState("");

  const [
    taxSettingsError,
    setTaxSettingsError,
  ] =
    useState("");

  useEffect(
    () =>
      subscribeTaxPolicy(
        () =>
          setTaxRevision(
            (current) =>
              current + 1,
          ),
      ),
    [],
  );

  const taxPolicy =
    useMemo(
      () =>
        getTaxPolicy(),
      [taxRevision],
    );

  const branchTaxProfile =
    useMemo(
      () =>
        getActiveBranchTaxProfile(),
      [
        taxRevision,
        configuration.storeCode,
      ],
    );

  const changeBranchTaxProfile = (
    profileId:
      BranchTaxProfileId,
  ) => {
    saveBranchTaxProfile(
      configuration.storeCode,
      profileId,
    );
  };

  useEffect(
    () => {
      setTaxRateDraft(
        (
          taxPolicy.rate *
          100
        ).toFixed(
          2,
        ).replace(
          /\.00$/,
          "",
        ),
      );
    },
    [
      taxPolicy.rate,
    ],
  );

  const commitTaxRate = (
    raw:
      string,
  ) => {
    const normalized =
      raw
        .trim()
        .replace(
          ",",
          ".",
        );

    const percent =
      Number(
        normalized,
      );

    if (
      !normalized ||
      !Number.isFinite(
        percent,
      ) ||
      percent < 0 ||
      percent > 100
    ) {
      setTaxSettingsError(
        "יש להזין שיעור מע״מ בין 0 ל־100.",
      );

      setTaxRateDraft(
        (
          taxPolicy.rate *
          100
        ).toFixed(
          2,
        ).replace(
          /\.00$/,
          "",
        ),
      );

      return;
    }

    setTaxSettingsError(
      "",
    );

    saveTaxPolicy({
      rate:
        percent /
        100,
    });
  };

  const [
    customerCreditPolicyRevision,
    setCustomerCreditPolicyRevision,
  ] =
    useState(0);

  useEffect(
    () =>
      subscribeCustomerCreditPolicy(
        () =>
          setCustomerCreditPolicyRevision(
            (current) =>
              current + 1,
          ),
      ),
    [],
  );

  const customerCreditPolicy =
    useMemo(
      () =>
        getCustomerCreditPolicy(),
      [
        customerCreditPolicyRevision,
      ],
    );

  const [
    returnPolicyRevision,
    setReturnPolicyRevision,
  ] =
    useState(0);

  const [
    cancellationFeePercentDraft,
    setCancellationFeePercentDraft,
  ] =
    useState("");

  const [
    cancellationFeeCapDraft,
    setCancellationFeeCapDraft,
  ] =
    useState("");

  const [
    returnPolicyError,
    setReturnPolicyError,
  ] =
    useState("");

  useEffect(
    () =>
      subscribeReturnPolicy(
        () =>
          setReturnPolicyRevision(
            (current) =>
              current + 1,
          ),
      ),
    [],
  );

  const returnPolicy =
    useMemo(
      () =>
        getReturnPolicy(),
      [
        returnPolicyRevision,
      ],
    );

  useEffect(
    () => {
      setCancellationFeePercentDraft(
        String(
          returnPolicy.cancellationFeePercent,
        ),
      );

      setCancellationFeeCapDraft(
        String(
          returnPolicy.cancellationFeeCap,
        ),
      );
    },
    [
      returnPolicy.cancellationFeePercent,
      returnPolicy.cancellationFeeCap,
    ],
  );

  const commitReturnPolicyNumber = (
    field:
      | "cancellationFeePercent"
      | "cancellationFeeCap",
    raw:
      string,
  ) => {
    const value =
      Number(
        raw
          .trim()
          .replace(
            ",",
            ".",
          ),
      );

    const max =
      field ===
        "cancellationFeePercent"
        ? 100
        : 100000;

    if (
      !Number.isFinite(
        value,
      ) ||
      value < 0 ||
      value > max
    ) {
      setReturnPolicyError(
        field ===
          "cancellationFeePercent"
          ? "אחוז דמי הביטול חייב להיות בין 0 ל־100."
          : "תקרת דמי הביטול אינה תקינה.",
      );

      setCancellationFeePercentDraft(
        String(
          returnPolicy.cancellationFeePercent,
        ),
      );

      setCancellationFeeCapDraft(
        String(
          returnPolicy.cancellationFeeCap,
        ),
      );

      return;
    }

    setReturnPolicyError(
      "",
    );

    saveReturnPolicy({
      [field]:
        value,
    });
  };

  const [
    paymentRevision,
    setPaymentRevision,
  ] =
    useState(0);

  const [
    paymentSettingsError,
    setPaymentSettingsError,
  ] =
    useState("");

  useEffect(
    () =>
      subscribePaymentMethodConfiguration(
        () =>
          setPaymentRevision(
            (current) =>
              current + 1,
          ),
      ),
    [],
  );

  const paymentMethods =
    useMemo(
      () =>
        resolvePaymentMethods(
          profile.paymentMethods,
        ),
      [
        profile.paymentMethods,
        paymentRevision,
      ],
    );

  const changePaymentMethodActive = (
    code:
      PaymentMethodCode,
    isActive:
      boolean,
  ) => {
    setPaymentSettingsError(
      "",
    );

    try {
      setPaymentMethodActive(
        code,
        isActive,
        profile.paymentMethods,
      );
    }
    catch (error) {
      if (
        error instanceof Error &&
        error.message ===
          "PAYMENT_METHOD_REQUIRED"
      ) {
        setPaymentSettingsError(
          "חייב להישאר לפחות אמצעי תשלום פעיל אחד.",
        );

        return;
      }

      setPaymentSettingsError(
        "לא ניתן לעדכן את אמצעי התשלום.",
      );
    }
  };

  const reorderPaymentMethod = (
    code:
      PaymentMethodCode,
    direction:
      "up" | "down",
  ) => {
    setPaymentSettingsError(
      "",
    );

    movePaymentMethod(
      code,
      direction,
      profile.paymentMethods,
    );
  };

  const activePaymentMethods =
    paymentMethods.filter(
      (method) =>
        method.isActive &&
        isPaymentMethodRuntimeAvailable(
          method.code,
        ),
    );

  const activeDefinition =
    sections.find(
      (section) =>
        section.id ===
        activeSection,
    ) ?? sections[0];

  const renderSection = () => {
    switch (activeSection) {
      case "business":
        return (
          <>
            <SectionHeading
              title="עסק וסניף"
              description="זהות העסק והסניף הפעיל נשמרת מקומית ומשמשת את Lumora גם ללא מערכת ניהול חיצונית."
              badge={`סניף ${configuration.storeCode}`}
            />

            <div className="settings-page__business-summary">
              <div>
                <span>
                  קוד סניף
                </span>
                <strong>
                  {configuration.storeCode}
                </strong>
              </div>

              <div>
                <span>
                  פרופיל מס
                </span>
                <strong>
                  {branchTaxProfile ===
                  "eilat_free_trade_zone"
                    ? "אזור אילת"
                    : "ישראל רגיל"}
                </strong>
              </div>

              <div>
                <span>
                  מקור
                </span>
                <strong>
                  {configuration.source ===
                  "local"
                    ? "Lumora מקומי"
                    : "חיצוני"}
                </strong>
              </div>
            </div>

            <div className="settings-page__business-card">
              <div className="settings-page__business-card-heading">
                <div>
                  <strong>
                    פרטי העסק
                  </strong>
                  <span>
                    פרטים משותפים לעסק ולא תלויים בסניף הפעיל.
                  </span>
                </div>
              </div>

              <div className="settings-page__business-grid">
                <label className="settings-page__field">
                  <span>
                    שם מסחרי
                  </span>
                  <input
                    value={
                      businessIdentity.tradingName
                    }
                    onChange={(
                      event,
                    ) =>
                      saveBusinessField({
                        tradingName:
                          event.target.value,
                      })
                    }
                  />
                </label>

                <label className="settings-page__field">
                  <span>
                    שם משפטי
                  </span>
                  <input
                    value={
                      businessIdentity.businessName
                    }
                    onChange={(
                      event,
                    ) =>
                      saveBusinessField({
                        businessName:
                          event.target.value,
                      })
                    }
                  />
                </label>

                <label className="settings-page__field">
                  <span>
                    מספר עסק
                  </span>
                  <input
                    dir="ltr"
                    value={
                      businessIdentity.businessNumber
                    }
                    onChange={(
                      event,
                    ) =>
                      saveBusinessField({
                        businessNumber:
                          event.target.value,
                      })
                    }
                  />
                </label>

                <label className="settings-page__field">
                  <span>
                    מספר עוסק / מע״מ
                  </span>
                  <input
                    dir="ltr"
                    value={
                      businessIdentity.vatNumber
                    }
                    onChange={(
                      event,
                    ) =>
                      saveBusinessField({
                        vatNumber:
                          event.target.value,
                      })
                    }
                  />
                </label>

                <label className="settings-page__field">
                  <span>
                    טלפון העסק
                  </span>
                  <input
                    dir="ltr"
                    value={
                      businessIdentity.phone
                    }
                    onChange={(
                      event,
                    ) =>
                      saveBusinessField({
                        phone:
                          event.target.value,
                      })
                    }
                  />
                </label>

                <label className="settings-page__field">
                  <span>
                    כתובת העסק
                  </span>
                  <input
                    value={
                      businessIdentity.address
                    }
                    onChange={(
                      event,
                    ) =>
                      saveBusinessField({
                        address:
                          event.target.value,
                      })
                    }
                  />
                </label>
              </div>
            </div>

            <div className="settings-page__business-card settings-page__business-card--branch">
              <div className="settings-page__business-card-heading">
                <div>
                  <strong>
                    הסניף הפעיל
                  </strong>
                  <span>
                    פרטים מקומיים לסניף {configuration.storeCode}. טלפון וכתובת סניף גוברים על פרטי העסק בתפעול המקומי.
                  </span>
                </div>

                <span className="settings-page__business-branch-code">
                  {configuration.storeCode}
                </span>
              </div>

              <div className="settings-page__business-grid">
                <label className="settings-page__field">
                  <span>
                    שם הסניף
                  </span>
                  <input
                    value={
                      businessIdentity.branchName
                    }
                    placeholder="לדוגמה: סניף אילת"
                    onChange={(
                      event,
                    ) =>
                      saveBusinessField({
                        branchName:
                          event.target.value,
                      })
                    }
                  />
                </label>

                <label className="settings-page__field">
                  <span>
                    טלפון הסניף
                  </span>
                  <input
                    dir="ltr"
                    value={
                      businessIdentity.branchPhone
                    }
                    placeholder={
                      businessIdentity.phone ||
                      "אופציונלי"
                    }
                    onChange={(
                      event,
                    ) =>
                      saveBusinessField({
                        branchPhone:
                          event.target.value,
                      })
                    }
                  />
                </label>

                <label className="settings-page__field settings-page__business-field--wide">
                  <span>
                    כתובת הסניף
                  </span>
                  <input
                    value={
                      businessIdentity.branchAddress
                    }
                    placeholder={
                      businessIdentity.address ||
                      "אופציונלי"
                    }
                    onChange={(
                      event,
                    ) =>
                      saveBusinessField({
                        branchAddress:
                          event.target.value,
                      })
                    }
                  />
                </label>
              </div>
            </div>

            <div className="settings-page__business-tax-link">
              <div>
                <strong>
                  מיסוי הסניף
                </strong>
                <span>
                  קוד הסניף {configuration.storeCode} משויך כרגע לפרופיל {branchTaxProfile ===
                  "eilat_free_trade_zone"
                    ? "אזור אילת"
                    : "ישראל רגיל"}. שינוי פרופיל המס מתבצע במסך ״מע״מ ומחירים״.
                </span>
              </div>
            </div>

            <div className="settings-page__save-note">
              <span aria-hidden="true" />
              השינויים נשמרים אוטומטית ומשפיעים על הסניף הפעיל.
            </div>
          </>
        );

      case "register":
        return (
          <>
            <SectionHeading
              title="קופה"
              description="זהות מקומית של העמדה. כל קופה עובדת עצמאית ושומרת את הזהות שלה גם במערך רב־קופתי."
              badge={`קופה ${configuration.registerCode}`}
            />

            <div className="settings-page__register-summary">
              <div>
                <span>
                  סניף
                </span>
                <strong>
                  {configuration.storeCode}
                </strong>
              </div>

              <div>
                <span>
                  קופה
                </span>
                <strong>
                  {configuration.registerCode}
                </strong>
              </div>

              <div>
                <span>
                  ניהול
                </span>
                <strong>
                  {configuration.source ===
                  "nextera"
                    ? "Nextera"
                    : "Standalone"}
                </strong>
              </div>
            </div>

            <div className="settings-page__register-card">
              <div className="settings-page__register-card-heading">
                <div>
                  <strong>
                    זהות העמדה
                  </strong>
                  <span>
                    שתי קופות באותו סניף משתמשות באותו קוד סניף ובקוד קופה שונה.
                  </span>
                </div>

                <span className="settings-page__register-source-badge">
                  {configuration.source ===
                  "nextera"
                    ? "מנוהל מרכזית"
                    : "מקומי"}
                </span>
              </div>

              <div className="settings-page__register-grid">
                <label className="settings-page__field">
                  <span>
                    קוד סניף
                  </span>

                  <input
                    dir="ltr"
                    inputMode="numeric"
                    maxLength={3}
                    disabled={
                      configuration.source ===
                      "nextera"
                    }
                    value={
                      storeCodeDraft
                    }
                    onChange={(
                      event,
                    ) => {
                      setRegisterIdentityError(
                        "",
                      );

                      setStoreCodeDraft(
                        event.target.value.replace(
                          /\D/g,
                          "",
                        ),
                      );
                    }}
                    onBlur={() =>
                      commitRegisterIdentity(
                        "storeCode",
                        storeCodeDraft,
                      )
                    }
                    onKeyDown={(
                      event,
                    ) => {
                      if (
                        event.key ===
                        "Enter"
                      ) {
                        event.currentTarget.blur();
                      }
                    }}
                  />
                </label>

                <label className="settings-page__field">
                  <span>
                    קוד קופה
                  </span>

                  <input
                    dir="ltr"
                    inputMode="numeric"
                    maxLength={3}
                    disabled={
                      configuration.source ===
                      "nextera"
                    }
                    value={
                      registerCodeDraft
                    }
                    onChange={(
                      event,
                    ) => {
                      setRegisterIdentityError(
                        "",
                      );

                      setRegisterCodeDraft(
                        event.target.value.replace(
                          /\D/g,
                          "",
                        ),
                      );
                    }}
                    onBlur={() =>
                      commitRegisterIdentity(
                        "registerCode",
                        registerCodeDraft,
                      )
                    }
                    onKeyDown={(
                      event,
                    ) => {
                      if (
                        event.key ===
                        "Enter"
                      ) {
                        event.currentTarget.blur();
                      }
                    }}
                  />
                </label>

                <label className="settings-page__field settings-page__register-name-field">
                  <span>
                    שם הקופה
                  </span>

                  <input
                    value={
                      registerLocalSettings.registerName
                    }
                    placeholder="לדוגמה: קופה ראשית"
                    onChange={(
                      event,
                    ) =>
                      saveRegisterLocalSettings({
                        registerName:
                          event.target.value,
                      })
                    }
                  />
                </label>
              </div>

              {registerIdentityError && (
                <div
                  className="settings-page__dialog-error settings-page__register-error"
                  role="alert"
                >
                  {registerIdentityError}
                </div>
              )}
            </div>

            <div className="settings-page__register-card">
              <div className="settings-page__register-card-heading">
                <div>
                  <strong>
                    חומרה מקומית
                  </strong>
                  <span>
                    ההגדרות האלה שייכות לעמדה הנוכחית ואינן אמורות לשנות קופה אחרת.
                  </span>
                </div>
              </div>

              <div className="settings-page__register-hardware">
                <SettingRow
                  label="סורק ברקוד"
                  hint="הפעלת יכולת הסריקה בעמדה הנוכחית."
                  value={
                    <SettingsToggle
                      checked={
                        registerLocalSettings.scannerEnabled
                      }
                      label="סורק ברקוד"
                      onChange={(
                        checked,
                      ) =>
                        saveRegisterLocalSettings({
                          scannerEnabled:
                            checked,
                        })
                      }
                    />
                  }
                />

                <SettingRow
                  label="מסוף אשראי חיצוני"
                  hint="מסוף נפרד ללא חיבור ישיר ל-Lumora. לאחר חיוב מוצלח מתעדים במסך התשלום את האסמכתה שקיבלת מהמסוף."
                  value={
                    <SettingsToggle
                      checked={
                        registerLocalSettings.paymentTerminalEnabled
                      }
                      label="מסוף אשראי חיצוני"
                      onChange={(
                        checked,
                      ) =>
                        saveRegisterLocalSettings({
                          paymentTerminalEnabled:
                            checked,
                        })
                      }
                    />
                  }
                />

                <SettingRow
                  label="מדפסת"
                  hint="רוחב נייר והגדרת המדפסת מנוהלים במסך ״מדפסת״."
                  value={
                    printer.paperFormat ===
                    "thermal80"
                      ? "80 מ״מ"
                      : "58 מ״מ"
                  }
                />
              </div>
            </div>

            <div className="settings-page__register-architecture-note">
              <strong>
                עבודה עצמאית
              </strong>

              <span>
                המכירה נשמרת קודם בקופה המקומית. Replicator או Nextera יכולים לסנכרן נתונים, אבל אינם תנאי להשלמת מכירה רגילה.
              </span>
            </div>

            <div className="settings-page__register-numbering-note">
              <strong>
                חשוב
              </strong>

              <span>
                קוד הסניף וקוד הקופה הם חלק מזהות ומספור המסמכים. במערך רב־קופתי כל קופה חייבת קוד קופה ייחודי בתוך אותו סניף.
              </span>
            </div>

            <div className="settings-page__save-note">
              <span aria-hidden="true" />
              זהות הקופה והחומרה נשמרות מקומית בעמדה.
            </div>
          </>
        );

      case "employees":
        return (
          <>
            <SectionHeading
              title="עובדים"
              description="הקמת עובדים, תפקידים וסטטוס פעילות. השבתה אינה מוחקת היסטוריית מכירות או נוכחות."
              badge={`${activeEmployees.length} פעילים`}
            />

            <div className="settings-page__employee-toolbar">
              <div>
                <strong>
                  צוות Lumora
                </strong>
                <span>
                  {employees.length} עובדים במערכת
                </span>
              </div>

              <button
                type="button"
                className="settings-page__primary-action"
                onClick={
                  openNewEmployee
                }
              >
                + עובד חדש
              </button>
            </div>

            <div className="settings-page__employee-list">
              {employees.map(
                (employee) => (
                  <article
                    key={employee.id}
                    className={`settings-page__employee-card ${
                      employee.isActive
                        ? ""
                        : "settings-page__employee-card--inactive"
                    }`}
                  >
                    <div className="settings-page__employee-avatar">
                      {employee.name
                        .trim()
                        .charAt(0)}
                    </div>

                    <div className="settings-page__employee-main">
                      <strong>{employee.name}</strong>
                      <span className="settings-page__employee-identifiers">
                        <b>
                          מס׳ עובד {formatEmployeeNumber(
                            employee.employeeNumber,
                          )}
                        </b>
                        <i aria-hidden="true">
                          ·
                        </i>
                        <span>
                          קוד {employee.code ?? "—"}
                        </span>
                      </span>

                      <div className="settings-page__role-list">
                        {employee.roles.map(
                          (role) => (
                            <span key={role}>
                              {roleLabels[role]}
                            </span>
                          ),
                        )}
                      </div>
                    </div>

                    <div className="settings-page__employee-actions">
                      <BooleanState
                        value={employee.isActive}
                      />

                      <button
                        type="button"
                        className="settings-page__small-action"
                        onClick={() =>
                          openEmployeeEditor(
                            employee,
                          )
                        }
                      >
                        עריכה
                      </button>

                      <button
                        type="button"
                        className="settings-page__small-action settings-page__small-action--muted"
                        onClick={() =>
                          setEmployeeActive(
                            employee.id,
                            !employee.isActive,
                          )
                        }
                      >
                        {employee.isActive
                          ? "השבתה"
                          : "הפעלה"}
                      </button>
                    </div>
                  </article>
                ),
              )}

              {employees.length === 0 && (
                <div className="settings-page__empty-state">
                  עדיין לא הוקמו עובדים.
                </div>
              )}
            </div>
          </>
        );

      case "attendance":
        return (
          <>
            <SectionHeading
              title="נוכחות"
              description="מדיניות הדיווח והבקרה של שעות העובדים."
              badge="Pilot"
            />

            <div className="settings-page__panel">
              <SettingRow
                label="סף יומי"
                value="9:00 שעות"
                hint="הדוח מחבר את כל הכניסות והיציאות באותו יום."
              />
              <SettingRow
                label="תיקון ידני"
                value="מנהל בלבד"
                hint="עובד אינו יכול לתקן את הנוכחות של עצמו."
              />
              <SettingRow
                label="רישום חסר"
                value="הוספה ידנית"
                hint="מתוך פירוט הנוכחות של העובד."
              />
            </div>
          </>
        );

      case "printer":
        return (
          <>
            <SectionHeading
              title="מדפסת"
              description="רוחב ההדפסה נשמר מקומית בקופה ומשמש את Lumora גם כשהיא פועלת באופן עצמאי."
              badge={
                printer.paperFormat === "thermal80"
                  ? "80 מ״מ פעיל"
                  : "58 מ״מ פעיל"
              }
            />

            <div className="settings-page__printer-summary">
              <div>
                <span>
                  קופה
                </span>
                <strong>
                  {printer.registerCode}
                </strong>
              </div>

              <div>
                <span>
                  סניף
                </span>
                <strong>
                  {printer.storeCode}
                </strong>
              </div>

              <div>
                <span>
                  רוחב נייר
                </span>
                <strong>
                  {printer.paperFormat === "thermal80"
                    ? "80 מ״מ"
                    : "58 מ״מ"}
                </strong>
              </div>
            </div>

            <div className="settings-page__choice-grid">
              <button
                type="button"
                className={`settings-page__choice ${
                  printer.paperFormat === "thermal80"
                    ? "settings-page__choice--selected"
                    : ""
                }`}
                aria-pressed={
                  printer.paperFormat === "thermal80"
                }
                onClick={() =>
                  saveRegisterPrinterPaperFormat(
                    "thermal80",
                  )
                }
              >
                <span className="settings-page__printer-roll">
                  <i />
                  <b />
                </span>

                <strong>
                  80 מ״מ
                </strong>

                <span>
                  קבלה רחבה · מתאים לרוב מדפסות הקופה הסטנדרטיות.
                </span>

                <em>
                  {printer.paperFormat === "thermal80"
                    ? "נבחר"
                    : "בחר 80 מ״מ"}
                </em>
              </button>

              <button
                type="button"
                className={`settings-page__choice ${
                  printer.paperFormat === "thermal57"
                    ? "settings-page__choice--selected"
                    : ""
                }`}
                aria-pressed={
                  printer.paperFormat === "thermal57"
                }
                onClick={() =>
                  saveRegisterPrinterPaperFormat(
                    "thermal57",
                  )
                }
              >
                <span className="settings-page__printer-roll settings-page__printer-roll--narrow">
                  <i />
                  <b />
                </span>

                <strong>
                  58 מ״מ
                </strong>

                <span>
                  קבלה צרה וקומפקטית למדפסות תרמיות קטנות.
                </span>

                <em>
                  {printer.paperFormat === "thermal57"
                    ? "נבחר"
                    : "בחר 58 מ״מ"}
                </em>
              </button>
            </div>

            <div className="settings-page__save-note">
              <span aria-hidden="true" />
              השינוי נשמר אוטומטית בקופה המקומית.
            </div>
          </>
        );

      case "documents":
        return (
          <>
            <SectionHeading
              title="מסמכים"
              description="מדיניות המסמכים של Lumora נשמרת מקומית ומשפיעה בפועל על מסמכי מכירה והחלפה."
              badge="Standalone"
            />

            <div className="settings-page__document-block">
              <div className="settings-page__document-block-heading">
                <div>
                  <strong>
                    החלפה בסכום 0
                  </strong>
                  <span>
                    איזה מסמך חשבונאי יופק כאשר ההחלפה מסתיימת ללא יתרה לתשלום או החזר.
                  </span>
                </div>
              </div>

              <div className="settings-page__document-choice-grid">
                <button
                  type="button"
                  className={`settings-page__document-choice ${
                    documentSettings
                      .zeroBalanceExchangeDocument ===
                    "tax_invoice_receipt"
                      ? "settings-page__document-choice--selected"
                      : ""
                  }`}
                  aria-pressed={
                    documentSettings
                      .zeroBalanceExchangeDocument ===
                    "tax_invoice_receipt"
                  }
                  onClick={() =>
                    saveDocumentSettings({
                      zeroBalanceExchangeDocument:
                        "tax_invoice_receipt",
                    })
                  }
                >
                  <strong>
                    חשבונית מס / קבלה
                  </strong>
                  <span>
                    מתאים לעסק שמפיק חשבונית מס/קבלה כמסמך המכירה.
                  </span>
                </button>

                <button
                  type="button"
                  className={`settings-page__document-choice ${
                    documentSettings
                      .zeroBalanceExchangeDocument ===
                    "receipt"
                      ? "settings-page__document-choice--selected"
                      : ""
                  }`}
                  aria-pressed={
                    documentSettings
                      .zeroBalanceExchangeDocument ===
                    "receipt"
                  }
                  onClick={() =>
                    saveDocumentSettings({
                      zeroBalanceExchangeDocument:
                        "receipt",
                    })
                  }
                >
                  <strong>
                    קבלה ₪0
                  </strong>
                  <span>
                    מתאים לעסק שעובד עם קבלות וחשבונית תקופתית / מרכזת.
                  </span>
                </button>
              </div>
            </div>

            <div className="settings-page__panel settings-page__documents-panel">
              <SettingRow
                label="הדפסה אוטומטית"
                hint="הדפס את המסמך החשבונאי אוטומטית לאחר השלמת העסקה."
                value={
                  <SettingsToggle
                    checked={
                      documentSettings
                        .autoPrintAccountingDocument
                    }
                    label="הדפסה אוטומטית"
                    onChange={(
                      checked,
                    ) =>
                      saveDocumentSettings({
                        autoPrintAccountingDocument:
                          checked,
                      })
                    }
                  />
                }
              />

              <SettingRow
                label="טיים אאוט מסך סיום עסקה"
                hint="לאחר הזמן שנבחר Lumora סוגרת את מסך הסיום וחוזרת אוטומטית לעבודה."
                value={
                  <div className="settings-page__timeout-options">
                    {[
                      10,
                      20,
                      30,
                      60,
                    ].map(
                      (
                        seconds,
                      ) => (
                        <button
                          key={seconds}
                          type="button"
                          className={
                            documentSettings
                              .postTransactionTimeoutSeconds ===
                            seconds
                              ? "settings-page__timeout-option settings-page__timeout-option--selected"
                              : "settings-page__timeout-option"
                          }
                          aria-pressed={
                            documentSettings
                              .postTransactionTimeoutSeconds ===
                            seconds
                          }
                          onClick={() =>
                            saveDocumentSettings({
                              postTransactionTimeoutSeconds:
                                seconds,
                            })
                          }
                        >
                          {seconds} שנ׳
                        </button>
                      ),
                    )}
                  </div>
                }
              />

              <SettingRow
                label="פתק החלפה"
                hint="מאפשר להפיק פתק החלפה לצד המסמך החשבונאי."
                value={
                  <SettingsToggle
                    checked={
                      documentSettings
                        .exchangeSlipEnabled
                    }
                    label="פתק החלפה"
                    onChange={(
                      checked,
                    ) =>
                      saveDocumentSettings({
                        exchangeSlipEnabled:
                          checked,
                      })
                    }
                  />
                }
              />

              <SettingRow
                label="מספר עותקי פתק החלפה"
                hint="ברירת המחדל בהפקת פתק החלפה."
                value={
                  <div className="settings-page__stepper">
                    <button
                      type="button"
                      aria-label="הפחת עותק"
                      disabled={
                        !documentSettings
                          .exchangeSlipEnabled ||
                        documentSettings
                          .exchangeSlipDefaultCopies <=
                          1
                      }
                      onClick={() =>
                        saveDocumentSettings({
                          exchangeSlipDefaultCopies:
                            documentSettings
                              .exchangeSlipDefaultCopies -
                            1,
                        })
                      }
                    >
                      −
                    </button>

                    <strong>
                      {documentSettings
                        .exchangeSlipDefaultCopies}
                    </strong>

                    <button
                      type="button"
                      aria-label="הוסף עותק"
                      disabled={
                        !documentSettings
                          .exchangeSlipEnabled ||
                        documentSettings
                          .exchangeSlipDefaultCopies >=
                          3
                      }
                      onClick={() =>
                        saveDocumentSettings({
                          exchangeSlipDefaultCopies:
                            documentSettings
                              .exchangeSlipDefaultCopies +
                            1,
                        })
                      }
                    >
                      +
                    </button>
                  </div>
                }
              />

              <SettingRow
                label="אפשר שליחת מסמך"
                hint="מאפשר את פעולת השליחה ממסך סיום העסקה. ערוצי השליחה עצמם מוגדרים לפי יכולות העסק."
                value={
                  <SettingsToggle
                    checked={
                      documentSettings
                        .sendDocumentEnabled
                    }
                    label="אפשר שליחת מסמך"
                    onChange={(
                      checked,
                    ) =>
                      saveDocumentSettings({
                        sendDocumentEnabled:
                          checked,
                      })
                    }
                  />
                }
              />
            </div>

            <div className="settings-page__document-capabilities">
              <span>
                ערוצים זמינים:
              </span>

              {profile.delivery.sms && (
                <b>SMS</b>
              )}

              {profile.delivery.whatsapp && (
                <b>WhatsApp</b>
              )}

              {profile.delivery.email && (
                <b>Email</b>
              )}

              {profile.delivery.print && (
                <b>הדפסה</b>
              )}
            </div>

            <div className="settings-page__save-note">
              <span aria-hidden="true" />
              כל שינוי נשמר אוטומטית ב-Lumora המקומית.
            </div>
          </>
        );

      case "footer":
        return (
          <>
            <SectionHeading
              title="פוטר למסמכים"
              description="הפוטר נשמר בתוך Lumora המקומית ומוכן לשימוש בכל מסמך מודפס — ללא תלות ב-Nextera."
              badge={
                footerSettings.enabled
                  ? "פעיל"
                  : "כבוי"
              }
            />

            <div className="settings-page__panel settings-page__footer-settings-panel">
              <SettingRow
                label="הצגת פוטר"
                hint="הפעלה או הסתרה של הפוטר במסמכי העסק."
                value={
                  <SettingsToggle
                    checked={
                      footerSettings.enabled
                    }
                    label="הצגת פוטר"
                    onChange={(
                      checked,
                    ) =>
                      saveDocumentFooterSettings({
                        enabled:
                          checked,
                      })
                    }
                  />
                }
              />
            </div>

            <div className="settings-page__footer-editor-grid">
              <div className="settings-page__footer-form">
                <label className="settings-page__field">
                  <span>
                    טקסט תודה
                  </span>

                  <input
                    value={
                      footerSettings.thankYouText
                    }
                    maxLength={
                      120
                    }
                    onChange={(
                      event,
                    ) =>
                      saveDocumentFooterSettings({
                        thankYouText:
                          event.target.value,
                      })
                    }
                    placeholder="תודה שקניתם אצלנו"
                  />
                </label>

                <label className="settings-page__field">
                  <span>
                    מדיניות החזרות / החלפות
                  </span>

                  <textarea
                    value={
                      footerSettings.returnPolicyText
                    }
                    maxLength={
                      240
                    }
                    onChange={(
                      event,
                    ) =>
                      saveDocumentFooterSettings({
                        returnPolicyText:
                          event.target.value,
                      })
                    }
                    placeholder="טקסט קצר שיופיע בתחתית המסמך"
                  />
                </label>

                <div className="settings-page__footer-contact-grid">
                  <label className="settings-page__field">
                    <span>
                      טלפון העסק
                    </span>

                    <input
                      dir="ltr"
                      value={
                        footerSettings.businessPhone
                      }
                      maxLength={
                        80
                      }
                      onChange={(
                        event,
                      ) =>
                        saveDocumentFooterSettings({
                          businessPhone:
                            event.target.value,
                        })
                      }
                      placeholder="03-0000000"
                    />
                  </label>

                  <label className="settings-page__field">
                    <span>
                      אתר אינטרנט
                    </span>

                    <input
                      dir="ltr"
                      value={
                        footerSettings.website
                      }
                      maxLength={
                        160
                      }
                      onChange={(
                        event,
                      ) =>
                        saveDocumentFooterSettings({
                          website:
                            event.target.value,
                        })
                      }
                      placeholder="www.example.co.il"
                    />
                  </label>

                  <label className="settings-page__field">
                    <span>
                      Instagram
                    </span>

                    <input
                      dir="ltr"
                      value={
                        footerSettings.instagram
                      }
                      maxLength={
                        120
                      }
                      onChange={(
                        event,
                      ) =>
                        saveDocumentFooterSettings({
                          instagram:
                            event.target.value,
                        })
                      }
                      placeholder="@business"
                    />
                  </label>

                  <label className="settings-page__field">
                    <span>
                      Facebook
                    </span>

                    <input
                      dir="ltr"
                      value={
                        footerSettings.facebook
                      }
                      maxLength={
                        120
                      }
                      onChange={(
                        event,
                      ) =>
                        saveDocumentFooterSettings({
                          facebook:
                            event.target.value,
                        })
                      }
                      placeholder="facebook.com/business"
                    />
                  </label>
                </div>

                <label className="settings-page__field">
                  <span>
                    טקסט חופשי
                  </span>

                  <textarea
                    value={
                      footerSettings.customText
                    }
                    maxLength={
                      240
                    }
                    onChange={(
                      event,
                    ) =>
                      saveDocumentFooterSettings({
                        customText:
                          event.target.value,
                      })
                    }
                    placeholder="הודעה נוספת, מבצע, שעות פעילות וכו׳"
                  />
                </label>

                <div className="settings-page__save-note">
                  <span aria-hidden="true" />
                  השינויים נשמרים אוטומטית בקופה המקומית.
                </div>
              </div>

              <div className="settings-page__footer-preview-wrap">
                <span className="settings-page__footer-preview-label">
                  תצוגה מקדימה
                </span>

                <div
                  className={`settings-page__footer-preview ${
                    footerSettings.enabled
                      ? ""
                      : "settings-page__footer-preview--disabled"
                  }`}
                >
                  <span className="settings-page__footer-preview-business">
                    {profile.identity.tradingName ??
                      profile.identity.businessName}
                  </span>

                  {footerSettings.enabled ? (
                    <>
                      {footerSettings.thankYouText && (
                        <strong>
                          {footerSettings.thankYouText}
                        </strong>
                      )}

                      {footerSettings.returnPolicyText && (
                        <p>
                          {footerSettings.returnPolicyText}
                        </p>
                      )}

                      {footerSettings.businessPhone && (
                        <p dir="ltr">
                          {footerSettings.businessPhone}
                        </p>
                      )}

                      {footerSettings.website && (
                        <p dir="ltr">
                          {footerSettings.website}
                        </p>
                      )}

                      {footerSettings.instagram && (
                        <p dir="ltr">
                          Instagram · {footerSettings.instagram}
                        </p>
                      )}

                      {footerSettings.facebook && (
                        <p dir="ltr">
                          Facebook · {footerSettings.facebook}
                        </p>
                      )}

                      {footerSettings.customText && (
                        <p className="settings-page__footer-preview-custom">
                          {footerSettings.customText}
                        </p>
                      )}
                    </>
                  ) : (
                    <p>
                      הפוטר כבוי ולא יודפס במסמכים.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </>
        );

      case "payments":
        return (
          <>
            <SectionHeading
              title="תשלומים"
              description="בחר אילו אמצעי תשלום זמינים בקופה וקבע את סדר הופעתם במסך התשלום."
              badge={`${activePaymentMethods.length} פעילים`}
            />

            <div className="settings-page__payment-callout">
              <div>
                <strong>
                  אמצעי התשלום של הקופה
                </strong>
                <span>
                  ההגדרה נשמרת מקומית ומשפיעה ישירות על מסך התשלום של Lumora.
                </span>
              </div>

              <span className="settings-page__payment-callout-badge">
                Standalone
              </span>
            </div>

            {paymentSettingsError && (
              <div
                className="settings-page__dialog-error settings-page__payment-error"
                role="alert"
              >
                {paymentSettingsError}
              </div>
            )}

            <div className="settings-page__payment-list settings-page__payment-list--editable">
              {paymentMethods.map(
                (
                  method,
                  index,
                ) => (
                  <article
                    key={method.code}
                    className={`settings-page__payment-card ${
                      method.isActive &&
                      isPaymentMethodRuntimeAvailable(
                        method.code,
                      )
                        ? ""
                        : "settings-page__payment-card--inactive"
                    }`}
                  >
                    <div className="settings-page__payment-order">
                      <strong>
                        {String(
                          index + 1,
                        ).padStart(
                          2,
                          "0",
                        )}
                      </strong>

                      <div>
                        <button
                          type="button"
                          aria-label={`העלה ${method.name}`}
                          disabled={
                            index === 0
                          }
                          onClick={() =>
                            reorderPaymentMethod(
                              method.code,
                              "up",
                            )
                          }
                        >
                          ↑
                        </button>

                        <button
                          type="button"
                          aria-label={`הורד ${method.name}`}
                          disabled={
                            index ===
                            paymentMethods.length -
                              1
                          }
                          onClick={() =>
                            reorderPaymentMethod(
                              method.code,
                              "down",
                            )
                          }
                        >
                          ↓
                        </button>
                      </div>
                    </div>

                    <div className="settings-page__payment-card-main">
                      <div className="settings-page__payment-title-row">
                        <strong>
                          {method.name}
                        </strong>

                        <span>
                          {isPaymentMethodRuntimeAvailable(
                            method.code,
                          )
                            ? paymentKindLabels[
                                method.kind
                              ]
                            : "לא זמין"}
                        </span>
                      </div>

                      <p>
                        {paymentMethodDescriptions[
                          method.code
                        ]}
                      </p>

                      <div className="settings-page__payment-capabilities">
                        {method.allowsPartialPayment && (
                          <span>
                            תשלום חלקי
                          </span>
                        )}

                        {method.requiresExternalReference && (
                          <span>
                            אסמכתא
                          </span>
                        )}

                        {method.returnsChange && (
                          <span>
                            עודף
                          </span>
                        )}
                      </div>
                    </div>

                    <SettingsToggle
                      checked={
                        method.isActive &&
                        isPaymentMethodRuntimeAvailable(
                          method.code,
                        )
                      }
                      disabled={
                        !isPaymentMethodRuntimeAvailable(
                          method.code,
                        )
                      }
                      label={`${method.name} ${
                        !isPaymentMethodRuntimeAvailable(
                          method.code,
                        )
                          ? "לא זמין"
                          : method.isActive
                            ? "פעיל"
                            : "כבוי"
                      }`}
                      onChange={(
                        checked,
                      ) =>
                        changePaymentMethodActive(
                          method.code,
                          checked,
                        )
                      }
                    />
                  </article>
                ),
              )}
            </div>

            <div className="settings-page__save-note">
              <span aria-hidden="true" />
              שינוי הפעלה או סדר נשמר אוטומטית ומופיע בעסקה הבאה.
            </div>
          </>
        );

      case "tax":
        return (
          <>
            <SectionHeading
              title="מע״מ ומחירים"
              description="מדיניות מס לפי סניף וסיווג מס לכל פריט. ההגדרות נשמרות מקומית ב-Lumora."
              badge={
                branchTaxProfile ===
                "eilat_free_trade_zone"
                  ? "פרופיל אילת"
                  : `${(
                      taxPolicy.rate *
                      100
                    )
                      .toFixed(
                        2,
                      )
                      .replace(
                        /\.00$/,
                        "",
                      )}%`
              }
            />

            <div className="settings-page__tax-summary">
              <div>
                <span>
                  סניף פעיל
                </span>
                <strong>
                  {profile.identity.branchName ??
                    `סניף ${configuration.storeCode}`}
                </strong>
                <small>
                  Store {configuration.storeCode}
                </small>
              </div>

              <div>
                <span>
                  שיעור רגיל
                </span>
                <strong>
                  {(
                    taxPolicy.rate *
                    100
                  )
                    .toFixed(
                      2,
                    )
                    .replace(
                      /\.00$/,
                      "",
                    )}%
                </strong>
              </div>

              <div>
                <span>
                  פרופיל מס לסניף
                </span>
                <strong>
                  {branchTaxProfile ===
                  "eilat_free_trade_zone"
                    ? "אזור אילת"
                    : "ישראל רגיל"}
                </strong>
              </div>
            </div>

            <div className="settings-page__tax-profile-block">
              <div className="settings-page__tax-profile-heading">
                <div>
                  <strong>
                    פרופיל מס לסניף הפעיל
                  </strong>
                  <span>
                    הפרופיל נשמר לפי קוד הסניף, כך שלכל סניף יכולה להיות מדיניות מס שונה.
                  </span>
                </div>
              </div>

              <div className="settings-page__tax-profile-grid">
                <button
                  type="button"
                  className={`settings-page__tax-profile-card ${
                    branchTaxProfile ===
                    "israel_standard"
                      ? "settings-page__tax-profile-card--selected"
                      : ""
                  }`}
                  aria-pressed={
                    branchTaxProfile ===
                    "israel_standard"
                  }
                  onClick={() =>
                    changeBranchTaxProfile(
                      "israel_standard",
                    )
                  }
                >
                  <strong>
                    ישראל רגיל
                  </strong>
                  <span>
                    פריט בסיווג רגיל משתמש בשיעור המע״מ המוגדר לעסק.
                  </span>
                </button>

                <button
                  type="button"
                  className={`settings-page__tax-profile-card ${
                    branchTaxProfile ===
                    "eilat_free_trade_zone"
                      ? "settings-page__tax-profile-card--selected"
                      : ""
                  }`}
                  aria-pressed={
                    branchTaxProfile ===
                    "eilat_free_trade_zone"
                  }
                  onClick={() =>
                    changeBranchTaxProfile(
                      "eilat_free_trade_zone",
                    )
                  }
                >
                  <strong>
                    אזור אילת
                  </strong>
                  <span>
                    פריטים רגילים מקבלים הקלת מס של הסניף; חריגים יכולים להישאר בשיעור הרגיל דרך סיווג הפריט.
                  </span>
                </button>
              </div>
            </div>

            <div className="settings-page__panel settings-page__tax-panel">
              <SettingRow
                label="שיעור מע״מ רגיל"
                hint="השיעור הבסיסי לעסק. הוא משמש סניפים רגילים וגם פריטים שמוגדרים כחייבים בשיעור רגיל."
                value={
                  <div className="settings-page__tax-rate-field">
                    <input
                      dir="ltr"
                      inputMode="decimal"
                      value={
                        taxRateDraft
                      }
                      onChange={(
                        event,
                      ) => {
                        setTaxSettingsError(
                          "",
                        );

                        setTaxRateDraft(
                          event.target.value,
                        );
                      }}
                      onBlur={() =>
                        commitTaxRate(
                          taxRateDraft,
                        )
                      }
                      onKeyDown={(
                        event,
                      ) => {
                        if (
                          event.key ===
                          "Enter"
                        ) {
                          event.currentTarget.blur();
                        }
                      }}
                      aria-label="שיעור מע״מ רגיל באחוזים"
                    />

                    <span>
                      %
                    </span>
                  </div>
                }
              />

              <SettingRow
                label="מחירי מכירה"
                hint="מחירי הקטלוג נשארים המחיר לצרכן; מנוע המס פותר את רכיב המס לפי סניף ופריט."
                value="מחיר לצרכן"
              />

              <SettingRow
                label="עלות מוצר"
                hint="עלות נשמרת לפני מע״מ; GP% משתמש בשיעור האפקטיבי של הפריט בסניף הפעיל."
                value="לפני מע״מ"
              />

              <SettingRow
                label="מקור המדיניות"
                hint="הקופה יכולה לעבוד עם המדיניות גם ללא Nextera."
                value="Lumora מקומי"
              />
            </div>

            <div className="settings-page__tax-class-guide">
              <div>
                <strong>
                  רגיל
                </strong>
                <span>
                  לפי פרופיל המס של הסניף
                </span>
              </div>

              <div>
                <strong>
                  פטור
                </strong>
                <span>
                  ללא סכום מע״מ
                </span>
              </div>

              <div>
                <strong>
                  שיעור 0%
                </strong>
                <span>
                  נשמר בנפרד מפטור
                </span>
              </div>

              <div>
                <strong>
                  רגיל תמיד
                </strong>
                <span>
                  נשאר בשיעור הרגיל גם בפרופיל אילת
                </span>
              </div>
            </div>

            {taxSettingsError && (
              <div
                className="settings-page__dialog-error settings-page__tax-error"
                role="alert"
              >
                {taxSettingsError}
              </div>
            )}

            <div className="settings-page__tax-notice">
              <strong>
                היסטוריה
              </strong>

              <span>
                בעת השלמת עסקה Lumora שומרת Snapshot של סיווג המס, פרופיל הסניף, השיעור וסכום המס בכל שורה. שינוי עתידי לא משנה עסקה שכבר הושלמה.
              </span>
            </div>

            <div className="settings-page__save-note">
              <span aria-hidden="true" />
              שינוי פרופיל הסניף נשמר מיד; שיעור המע״מ נשמר לאחר יציאה מהשדה או Enter.
            </div>
          </>
        );

      case "returns":
        return (
          <>
            <SectionHeading
              title="החזרות והחלפות"
              description="מדיניות מקומית של Lumora. ההגדרות משפיעות על פעולות החזרה והחלפה בקופה."
              badge={
                returnPolicy.returnsEnabled
                  ? "פעיל"
                  : "חסום"
              }
            />

            <div className="settings-page__panel settings-page__returns-panel">
              <SettingRow
                label="החזרות"
                hint="מאפשר החזרת פריטים מעסקאות קיימות."
                value={
                  <SettingsToggle
                    checked={
                      returnPolicy.returnsEnabled
                    }
                    label="החזרות"
                    onChange={(
                      checked,
                    ) =>
                      saveReturnPolicy({
                        returnsEnabled:
                          checked,
                      })
                    }
                  />
                }
              />

              <SettingRow
                label="החלפות"
                hint="מאפשר עסקה שמשלבת פריט מוחזר ופריט חדש."
                value={
                  <SettingsToggle
                    checked={
                      returnPolicy.exchangesEnabled
                    }
                    label="החלפות"
                    onChange={(
                      checked,
                    ) =>
                      saveReturnPolicy({
                        exchangesEnabled:
                          checked,
                      })
                    }
                  />
                }
              />

              <SettingRow
                label="חלון החזרה"
                hint="נבדק לפי מועד העסקה המקורית. ללא הגבלה משמר את ההתנהגות הקיימת."
                value={
                  <select
                    className="settings-page__policy-select"
                    value={
                      returnPolicy.returnWindowDays
                    }
                    onChange={(
                      event,
                    ) =>
                      saveReturnPolicy({
                        returnWindowDays:
                          Number(
                            event.target.value,
                          ),
                      })
                    }
                  >
                    <option value={0}>
                      ללא הגבלה
                    </option>
                    <option value={7}>
                      7 ימים
                    </option>
                    <option value={14}>
                      14 ימים
                    </option>
                    <option value={30}>
                      30 ימים
                    </option>
                    <option value={60}>
                      60 ימים
                    </option>
                  </select>
                }
              />

              <SettingRow
                label="החזרה ללא מסמך"
                hint="מציג או מסתיר את מסלול החזרת הפריט ללא עסקת מקור."
                value={
                  <SettingsToggle
                    checked={
                      returnPolicy.allowReturnWithoutDocument
                    }
                    label="החזרה ללא מסמך"
                    onChange={(
                      checked,
                    ) =>
                      saveReturnPolicy({
                        allowReturnWithoutDocument:
                          checked,
                      })
                    }
                  />
                }
              />

              <SettingRow
                label="החזר ללא מסמך"
                hint="אילו אמצעי החזר מותרים כאשר אין עסקת מקור."
                value={
                  <select
                    className="settings-page__policy-select settings-page__policy-select--wide"
                    value={
                      returnPolicy.withoutDocumentRefundMode
                    }
                    disabled={
                      !returnPolicy.allowReturnWithoutDocument
                    }
                    onChange={(
                      event,
                    ) =>
                      saveReturnPolicy({
                        withoutDocumentRefundMode:
                          event.target.value as WithoutDocumentRefundMode,
                      })
                    }
                  >
                    <option value="any_available">
                      כל אמצעי ההחזר הזמינים
                    </option>
                    <option value="cash_or_credit_voucher">
                      מזומן או שובר זיכוי
                    </option>
                    <option value="credit_voucher_only">
                      שובר זיכוי בלבד
                    </option>
                  </select>
                }
              />
            </div>

            <div className="settings-page__returns-fee-card">
              <div className="settings-page__returns-fee-heading">
                <div>
                  <strong>
                    דמי ביטול
                  </strong>
                  <span>
                    החישוב מופעל רק כאשר הקופאי בוחר להחיל דמי ביטול במסך ההחזר.
                  </span>
                </div>

                <span>
                  {returnPolicy.cancellationFeePercent}% · עד ₪
                  {returnPolicy.cancellationFeeCap}
                </span>
              </div>

              <div className="settings-page__returns-fee-grid">
                <label className="settings-page__field">
                  <span>
                    אחוז
                  </span>

                  <div className="settings-page__number-suffix">
                    <input
                      dir="ltr"
                      inputMode="decimal"
                      value={
                        cancellationFeePercentDraft
                      }
                      onChange={(
                        event,
                      ) => {
                        setReturnPolicyError(
                          "",
                        );

                        setCancellationFeePercentDraft(
                          event.target.value,
                        );
                      }}
                      onBlur={() =>
                        commitReturnPolicyNumber(
                          "cancellationFeePercent",
                          cancellationFeePercentDraft,
                        )
                      }
                      onKeyDown={(
                        event,
                      ) => {
                        if (
                          event.key ===
                          "Enter"
                        ) {
                          event.currentTarget.blur();
                        }
                      }}
                    />

                    <b>
                      %
                    </b>
                  </div>
                </label>

                <label className="settings-page__field">
                  <span>
                    תקרה
                  </span>

                  <div className="settings-page__number-suffix">
                    <input
                      dir="ltr"
                      inputMode="decimal"
                      value={
                        cancellationFeeCapDraft
                      }
                      onChange={(
                        event,
                      ) => {
                        setReturnPolicyError(
                          "",
                        );

                        setCancellationFeeCapDraft(
                          event.target.value,
                        );
                      }}
                      onBlur={() =>
                        commitReturnPolicyNumber(
                          "cancellationFeeCap",
                          cancellationFeeCapDraft,
                        )
                      }
                      onKeyDown={(
                        event,
                      ) => {
                        if (
                          event.key ===
                          "Enter"
                        ) {
                          event.currentTarget.blur();
                        }
                      }}
                    />

                    <b>
                      ₪
                    </b>
                  </div>
                </label>
              </div>
            </div>

            {returnPolicyError && (
              <div
                className="settings-page__dialog-error settings-page__returns-error"
                role="alert"
              >
                {returnPolicyError}
              </div>
            )}

            <div className="settings-page__returns-rule">
              <strong>
                מלאי
              </strong>

              <span>
                פריט מוחזר חוזר למלאי רק לאחר שהפריט התקבל בפועל. שינוי כמות המלאי אינו מתבצע מתוך מסך המדיניות.
              </span>
            </div>

            <div className="settings-page__save-note">
              <span aria-hidden="true" />
              השינויים נשמרים אוטומטית מקומית ב-Lumora.
            </div>
          </>
        );

      case "customers": {
        const storeCreditMethod =
          paymentMethods.find(
            (method) =>
              method.code ===
              "store_credit",
          );

        return (
          <>
            <SectionHeading
              title="לקוחות והקפה"
              description="מדיניות הלקוח והאובליגו נשמרת מקומית ומשמשת את אימות הלקוחות ואת מסלול ההקפה של Lumora."
              badge={
                storeCreditMethod
                  ?.isActive
                  ? "הקפה פעילה"
                  : "הקפה כבויה"
              }
            />

            <div className="settings-page__customer-summary">
              <div>
                <span>
                  מועדון
                </span>
                <strong>
                  {customerCreditPolicy.customerClubEnabled
                    ? "פעיל"
                    : "כבוי"}
                </strong>
              </div>

              <div>
                <span>
                  זיהוי לקוח
                </span>
                <strong>
                  {customerCreditPolicy.requireCustomerId
                    ? "ת״ז חובה"
                    : "ת״ז רשות"}
                </strong>
              </div>

              <div>
                <span>
                  חריגה מאובליגו
                </span>
                <strong>
                  אישור מנהל
                </strong>
              </div>
            </div>

            <div className="settings-page__panel settings-page__customer-policy-panel">
              <SettingRow
                label="מועדון לקוחות"
                hint="מפעיל את יכולת מועדון הלקוחות בפרופיל העסק."
                value={
                  <SettingsToggle
                    checked={
                      customerCreditPolicy.customerClubEnabled
                    }
                    label="מועדון לקוחות"
                    onChange={(
                      checked,
                    ) =>
                      saveCustomerCreditPolicy({
                        customerClubEnabled:
                          checked,
                      })
                    }
                  />
                }
              />

              <SettingRow
                label="תעודת זהות"
                hint="כאשר פעיל, לקוח חדש חייב תעודת זהות תקינה."
                value={
                  <SettingsToggle
                    checked={
                      customerCreditPolicy.requireCustomerId
                    }
                    label="תעודת זהות חובה"
                    onChange={(
                      checked,
                    ) =>
                      saveCustomerCreditPolicy({
                        requireCustomerId:
                          checked,
                      })
                    }
                  />
                }
              />

              <SettingRow
                label="תאריך לידה"
                hint="כאשר פעיל, תאריך לידה נדרש בשמירת לקוח."
                value={
                  <SettingsToggle
                    checked={
                      customerCreditPolicy.requireCustomerBirthDate
                    }
                    label="תאריך לידה חובה"
                    onChange={(
                      checked,
                    ) =>
                      saveCustomerCreditPolicy({
                        requireCustomerBirthDate:
                          checked,
                      })
                    }
                  />
                }
              />

              <SettingRow
                label="טלפון ייחודי"
                hint="מונע משני לקוחות פעילים להשתמש באותו מספר טלפון."
                value={
                  <SettingsToggle
                    checked={
                      customerCreditPolicy.uniqueActivePhone
                    }
                    label="טלפון ייחודי"
                    onChange={(
                      checked,
                    ) =>
                      saveCustomerCreditPolicy({
                        uniqueActivePhone:
                          checked,
                      })
                    }
                  />
                }
              />

              <SettingRow
                label="תעודת זהות ייחודית"
                hint="כאשר קיימת תעודת זהות, מונע כפילות בין לקוחות פעילים."
                value={
                  <SettingsToggle
                    checked={
                      customerCreditPolicy.uniqueActiveCustomerId
                    }
                    label="תעודת זהות ייחודית"
                    onChange={(
                      checked,
                    ) =>
                      saveCustomerCreditPolicy({
                        uniqueActiveCustomerId:
                          checked,
                      })
                    }
                  />
                }
              />
            </div>

            <div className="settings-page__customer-credit-card">
              <div className="settings-page__customer-credit-heading">
                <div>
                  <strong>
                    הקפה / אובליגו
                  </strong>
                  <span>
                    מסגרת האשראי עצמה מוגדרת לכל לקוח בנפרד בכרטיס הלקוח.
                  </span>
                </div>

                <SettingsToggle
                  checked={
                    storeCreditMethod
                      ?.isActive ??
                    false
                  }
                  label="הקפה בקופה"
                  onChange={(
                    checked,
                  ) =>
                    changePaymentMethodActive(
                      "store_credit",
                      checked,
                    )
                  }
                />
              </div>

              <div className="settings-page__customer-credit-rules">
                <SettingRow
                  label="חריגה ממסגרת"
                  hint="תשלום מעבר לאשראי הפנוי דורש אישור מנהל מורשה."
                  value="אישור מנהל"
                />

                <SettingRow
                  label="סיבת חריגה"
                  hint="קובע אם מנהל חייב להזין סיבה לפני אישור חריגה מהאובליגו."
                  value={
                    <SettingsToggle
                      checked={
                        customerCreditPolicy.requireManagerApprovalReason
                      }
                      label="סיבת חריגה חובה"
                      onChange={(
                        checked,
                      ) =>
                        saveCustomerCreditPolicy({
                          requireManagerApprovalReason:
                            checked,
                        })
                      }
                    />
                  }
                />

                <SettingRow
                  label="יתרת זכות ללקוח"
                  hint="מאפשר לחשבון לקוח לעבור מתקרת חוב/אפס ליתרה שלילית, כלומר זכות של הלקוח מול העסק."
                  value={
                    <SettingsToggle
                      checked={
                        customerCreditPolicy.allowCustomerCreditBalance
                      }
                      label="יתרת זכות מותרת"
                      onChange={(
                        checked,
                      ) =>
                        saveCustomerCreditPolicy({
                          allowCustomerCreditBalance:
                            checked,
                        })
                      }
                    />
                  }
                />
              </div>
            </div>

            {paymentSettingsError && (
              <div
                className="settings-page__dialog-error settings-page__customer-policy-error"
                role="alert"
              >
                {paymentSettingsError}
              </div>
            )}

            <div className="settings-page__customer-policy-note">
              <strong>
                חשוב
              </strong>

              <span>
                יתרה חיובית בחשבון היא חוב של הלקוח לעסק. יתרה שלילית היא זכות של הלקוח. שינוי המדיניות אינו מוחק או משנה יתרות קיימות.
              </span>
            </div>

            <div className="settings-page__save-note">
              <span aria-hidden="true" />
              השינויים נשמרים אוטומטית ומופעלים ללא תלות ב-Nextera.
            </div>
          </>
        );
      }

      case "display":
        return (
          <>
            <SectionHeading
              title="שפות"
              description="שפת הממשק המקומית של Lumora וחבילות השפה הזמינות."
            />

            <LanguageSettingsPanel />
          </>
        );
    }
  };

  return (
    <section
      className="settings-page"
      dir="rtl"
    >
      <header className="settings-page__header">
        <div>
          <span className="settings-page__eyebrow">
            LUMORA / CONTROL
          </span>
          <h1>הגדרות</h1>
          <p>
            ניהול מקומי של הקופה והעסק — Lumora עומדת בפני עצמה.
          </p>
        </div>

        <div className="settings-page__independence">
          <span aria-hidden="true" />
          הגדרות מקומיות פעילות
        </div>
      </header>

      <div className="settings-page__workspace">
        <aside className="settings-page__nav">
          {sections.map(
            (section) => (
              <button
                key={section.id}
                type="button"
                className={`settings-page__nav-item ${
                  section.id === activeSection
                    ? "settings-page__nav-item--active"
                    : ""
                }`}
                onClick={() =>
                  setActiveSection(
                    section.id,
                  )
                }
              >
                <span
                  className="settings-page__nav-icon"
                  aria-hidden="true"
                >
                  {section.icon}
                </span>

                <span className="settings-page__nav-copy">
                  <strong>{section.label}</strong>
                  <small>
                    {section.description}
                  </small>
                </span>
              </button>
            ),
          )}
        </aside>

        <main className="settings-page__content">
          <div
            className="settings-page__content-card"
            key={activeDefinition.id}
          >
            {renderSection()}
          </div>
        </main>
      </div>

      {employeeEditor && (
        <div
          className="settings-page__modal-overlay"
          role="presentation"
          onMouseDown={() =>
            setEmployeeEditor(
              null,
            )
          }
        >
          <section
            className="settings-page__employee-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-employee-dialog-title"
            onMouseDown={(
              event,
            ) =>
              event.stopPropagation()
            }
          >
            <header className="settings-page__dialog-header">
              <div>
                <span className="settings-page__eyebrow">
                  LUMORA / EMPLOYEES
                </span>
                <h3 id="settings-employee-dialog-title">
                  {employeeEditor.mode === "create"
                    ? "עובד חדש"
                    : "עריכת עובד"}
                </h3>
              </div>

              <button
                type="button"
                className="settings-page__dialog-close"
                aria-label="סגור"
                onClick={() =>
                  setEmployeeEditor(
                    null,
                  )
                }
              >
                ×
              </button>
            </header>

            <div className="settings-page__dialog-body">
              <div className="settings-page__employee-number-field">
                <div>
                  <span>
                    מספר עובד
                  </span>
                  <small>
                    מזהה קבוע שמוקצה אוטומטית ואינו ניתן לעריכה.
                  </small>
                </div>

                <strong>
                  {employeeEditor.mode === "edit"
                    ? formatEmployeeNumber(
                        employees.find(
                          (employee) =>
                            employee.id === employeeEditor.employeeId,
                        )?.employeeNumber,
                      )
                    : "יוקצה בשמירה"}
                </strong>
              </div>

              <label className="settings-page__field">
                <span>
                  שם עובד
                </span>
                <input
                  value={
                    employeeEditor.name
                  }
                  autoFocus
                  onChange={(
                    event,
                  ) =>
                    setEmployeeEditor({
                      ...employeeEditor,
                      name:
                        event.target.value,
                    })
                  }
                  placeholder="לדוגמה: דנה לוי"
                />
              </label>

              <label className="settings-page__field">
                <span>
                  קוד עובד / קוד תפעולי
                </span>
                <input
                  value={
                    employeeEditor.code
                  }
                  onChange={(
                    event,
                  ) =>
                    setEmployeeEditor({
                      ...employeeEditor,
                      code:
                        event.target.value,
                    })
                  }
                  placeholder="לדוגמה: 03"
                />
                <small>
                  הקוד נשאר ייחודי ומשמש לצרכים תפעוליים; מספר העובד מוקצה בנפרד.
                </small>
              </label>

              <fieldset className="settings-page__roles-fieldset">
                <legend>
                  תפקידים
                </legend>

                <div className="settings-page__role-choices">
                  {(
                    [
                      "seller",
                      "cashier",
                      "manager",
                    ] as EmployeeRole[]
                  ).map(
                    (role) => {
                      const selected =
                        employeeEditor.roles.includes(
                          role,
                        );

                      return (
                        <button
                          key={role}
                          type="button"
                          className={`settings-page__role-choice ${
                            selected
                              ? "settings-page__role-choice--selected"
                              : ""
                          }`}
                          aria-pressed={
                            selected
                          }
                          onClick={() =>
                            toggleEmployeeRole(
                              role,
                            )
                          }
                        >
                          {roleLabels[role]}
                        </button>
                      );
                    },
                  )}
                </div>
              </fieldset>

              <label className="settings-page__active-switch">
                <div>
                  <strong>
                    עובד פעיל
                  </strong>
                  <span>
                    עובד מושבת נשמר בהיסטוריה אך לא זמין לפעילות חדשה.
                  </span>
                </div>

                <input
                  type="checkbox"
                  checked={
                    employeeEditor.isActive
                  }
                  onChange={(
                    event,
                  ) =>
                    setEmployeeEditor({
                      ...employeeEditor,
                      isActive:
                        event.target.checked,
                    })
                  }
                />
              </label>

              {employeeEditorError && (
                <div
                  className="settings-page__dialog-error"
                  role="alert"
                >
                  {employeeEditorError}
                </div>
              )}
            </div>

            <footer className="settings-page__dialog-footer">
              <button
                type="button"
                className="settings-page__secondary-action"
                onClick={() =>
                  setEmployeeEditor(
                    null,
                  )
                }
              >
                ביטול
              </button>

              <button
                type="button"
                className="settings-page__primary-action"
                onClick={
                  saveEmployee
                }
              >
                שמור עובד
              </button>
            </footer>
          </section>
        </div>
      )}
    </section>
  );
}

export default SettingsPage;
