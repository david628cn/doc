import React, {
    createContext,
    useContext,
    useReducer,
    useLayoutEffect,
    useRef,
    cloneElement
} from 'react';
import { Button } from '../button'; // 確保路徑正確
import { CLASSNAME } from '../config';
import './index.less';

// --- 1. 類型定義 ---
type RuleObject = {
    required?: boolean;
    message?: string;
    type?: 'email' | 'url' | 'number' | 'string';
    whitespace?: boolean;
    min?: number;
    max?: number;
    validator?: (rule: RuleObject, value: any, signal?: AbortSignal) => Promise<void | any>;
};

// type RuleRender<Values> = (form: FormStore<any>) => RuleObject;

// interface FormItemProps<Values = any> {
//     name: keyof Values;
//     label?: React.ReactNode;
//     dependencies?: (keyof Values)[];
//     rules?: (RuleObject | RuleRender<Values>)[];
//     normalize?: (value: any) => any;
//     children?: React.ReactNode;
//     validateTrigger?: 'onChange' | 'onBlur';
//     style?: React.CSSProperties;
//     className?: string;
// }

// --- 2. 邏輯核心 FormStore ---
class FormStore<Values extends Record<string, any> = any> {
    private store: Values = {} as Values;
    private initialValues: Values = {} as Values;
    private errors: Record<string, string> = {};
    private loadingFields: Record<string, boolean> = {};
    private fieldEntities: any[] = [];
    /** 每次 FormItem render 写入，避免 validateAll 仍用 register 快照里的旧 rules/normalize */
    private fieldRuntime: Record<
        string,
        {
            rules?: any[];
            normalize?: (v: any) => any;
            dependencies?: any[];
            validateTrigger?: 'onChange' | 'onBlur';
        }
    > = {};
    private abortControllers: Record<string, AbortController> = {};
    private debounceTimers: Record<string, any> = {};

    constructor(initialValues: Values = {} as Values) {
        this.store = { ...initialValues };
        this.initialValues = { ...initialValues };
    }

    private runInternalValidate(value: any, rule: RuleObject) {
        if (rule.required) {
            if (value === undefined || value === null || value === "") return false;
            if (rule.whitespace && typeof value === 'string' && value.trim() === "") return false;
        }
        if (value !== undefined && value !== null && value !== '' && rule.type) {
            if (rule.type === 'email' && !/^\S+@\S+\.\S+$/.test(String(value))) return false;
            if (rule.type === 'url' && !/^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/i.test(String(value))) return false;
            if (rule.type === 'number' && Number.isNaN(Number(value))) return false;
        }
        if (rule.min != null && value !== '' && value !== undefined && value !== null) {
            if (typeof value === 'string') {
                if (value.length < rule.min) return false;
            } else {
                const n = Number(value);
                if (Number.isNaN(n) || n < rule.min) return false;
            }
        }
        if (rule.max != null && value !== '' && value !== undefined && value !== null) {
            if (typeof value === 'string') {
                if (value.length > rule.max) return false;
            } else {
                const n = Number(value);
                if (!Number.isNaN(n) && n > rule.max) return false;
            }
        }
        return true;
    }

    /** Rule 工厂函数本身是同步的；只有带 validator 或返回带 validator 的规则才需要长防抖 */
    private fieldRulesHaveAsyncValidator(rules: any[]) {
        if (!rules?.length) return false;
        return rules.some((r) => {
            const ro = typeof r === 'function' ? r(this) : r;
            return ro && typeof ro === 'object' && typeof ro.validator === 'function';
        });
    }

    private runValidation = async (name: string | number, rules: any[]) => {
        const key = String(name);
        if (this.abortControllers[key]) this.abortControllers[key].abort();
        const controller = new AbortController();
        this.abortControllers[key] = controller;

        this.loadingFields[key] = true;
        this.notify(name);

        let error = "";
        try {
            const value = this.store[name as keyof Values];
            for (let rule of rules) {
                const currentRule = typeof rule === 'function' ? rule(this) : rule;
                if (!this.runInternalValidate(value, currentRule)) {
                    error = currentRule.message || "检验失败";
                    break;
                }
                if (currentRule.validator) {
                    await currentRule.validator(currentRule, value, controller.signal);
                }
            }
            this.errors[key] = error;
        } catch (err: any) {
            if (err.name !== 'AbortError') {
                this.errors[key] = err?.message || err || "检验失败";
            }
        } finally {
            if (this.abortControllers[key] === controller) {
                this.loadingFields[key] = false;
                this.notify(name);
            }
        }
        return this.errors[key] ?? '';
    };

    /** 避免与 validateAll 竞态：防抖定时器在提交全量校验后再跑会覆盖结果 */
    clearPendingFieldValidations = () => {
        Object.keys(this.debounceTimers).forEach((key) => {
            const t = this.debounceTimers[key];
            if (t) clearTimeout(t);
            delete this.debounceTimers[key];
        });
    };

    /** @internal 由 FormItem 每次 render 调用，保证提交校验与 normalize 与当前 props 一致 */
    syncFieldRuntime = (
        name: string,
        partial: {
            rules?: any[];
            normalize?: (v: any) => any;
            dependencies?: any[];
            validateTrigger?: 'onChange' | 'onBlur';
        }
    ) => {
        if (!name || name === '__SUBMIT_BUTTON__') return;
        this.fieldRuntime[name] = { ...this.fieldRuntime[name], ...partial };
    };

    private getRulesForFieldName(name: string) {
        return this.fieldRuntime[name]?.rules ?? [];
    }

    private getNormalizeForFieldName(name: string) {
        return this.fieldRuntime[name]?.normalize;
    }

    private getDependenciesForFieldName(name: string) {
        return this.fieldRuntime[name]?.dependencies;
    }

    getFieldValue = (name: string | number) => this.store[name as keyof Values];
    getFieldsValue = () => ({ ...this.store });
    getFieldError = (name: string | number) => this.errors[String(name)];
    isFieldValidating = (name: string | number) => !!this.loadingFields[String(name)];
    syncInitialValues = () => (this.initialValues = { ...this.store });

    // focusFirstField = () => {
    //     // 延迟执行以避开 Dialog 的动画时间
    //     setTimeout(() => {
    //         // 找到第一个带有 _isField 标识的实体
    //         const firstEntity = this.fieldEntities.find(e => e._isField);
    //         if (firstEntity?.focus) {
    //             firstEntity.focus();
    //         }
    //     }, 200); // 200ms 通常能覆盖大多数弹层动画
    // };

    setFieldValue = (name: string | number, value: any, rules?: any[]) => {
        const entity = this.fieldEntities.find((e) => e.props.name === name);
        const normalize =
            this.getNormalizeForFieldName(String(name)) ?? entity?.props?.normalize;
        const transformedValue = normalize ? normalize(value) : value;
        this.store[name as keyof Values] = transformedValue;

        if (rules) this.validateField(name, rules);
        this.fieldEntities.forEach((e) => {
            const depName = e.props.name;
            if (depName == null || depName === '') return;
            const depKey = String(depName);
            const deps = this.getDependenciesForFieldName(depKey) ?? e.props.dependencies;
            if (deps?.includes(name as never)) {
                const fromRt = this.getRulesForFieldName(depKey);
                const depRules = fromRt.length > 0 ? fromRt : e.props.rules || [];
                this.validateField(depName, depRules);
            }
        });
        this.notify(name);
    };

    setFieldsValue = (values: Partial<Values>) => {
        this.store = { ...this.store, ...values };
        Object.keys(values).forEach(name => this.notify(name));
        this.notify('__GLOBAL__');
    };

    validateField = async (name: string | number, rules: any[]) => {
        const timerKey = String(name);
        if (this.debounceTimers[timerKey]) clearTimeout(this.debounceTimers[timerKey]);
        return new Promise((resolve) => {
            const hasAsyncValidator = this.fieldRulesHaveAsyncValidator(rules || []);
            this.debounceTimers[timerKey] = setTimeout(async () => {
                const error = await this.runValidation(name, rules);
                resolve(error);
            }, hasAsyncValidator ? 400 : 0);
        });
    };

    validateAll = async () => {
        this.clearPendingFieldValidations();
        const entities = this.fieldEntities.filter((e) => {
            const n = e.props.name;
            return (
                n != null &&
                n !== '' &&
                n !== '__SUBMIT_BUTTON__' &&
                typeof n !== 'object'
            );
        });
        if (entities.length === 0) {
            this.fieldEntities.forEach((e) => e.onStoreChange());
            return false;
        }
        const seen = new Set<string>();
        const uniqueEntities = entities.filter((e) => {
            const rtKey = String(e.props.name);
            if (seen.has(rtKey)) return false;
            seen.add(rtKey);
            return true;
        });
        const promises = uniqueEntities.map((e) => {
            const rawName = e.props.name;
            const rtKey = String(rawName);
            const fromRuntime = this.getRulesForFieldName(rtKey);
            const rules =
                fromRuntime.length > 0 ? fromRuntime : e.props.rules || [];
            return this.runValidation(rawName, rules);
        });
        const results = await Promise.all(promises);
        this.fieldEntities.forEach((e) => e.onStoreChange());
        const isValid = results.every((res) => !res);
        // --- 新增：自动焦点逻辑 ---
        if (!isValid) {
            setTimeout(() => {
                const firstErrorEntity = this.fieldEntities.find(e =>
                    this.getFieldError(e.props.name) && e._isField
                );
                firstErrorEntity?.focus?.();
            }, 0);
        }
        return isValid;
    };

    resetFields = () => {
        this.store = { ...this.initialValues };
        this.errors = {};
        this.fieldEntities.forEach(e => e.onStoreChange());
    };

    registerField = (entity: any) => {
        this.fieldEntities.push(entity);
        return () => (this.fieldEntities = this.fieldEntities.filter(i => i !== entity));
    };

    private notify = (name: string | number) => {
        this.fieldEntities.forEach((e) => {
            if (
                e.props.name === name ||
                !e.props.name ||
                e.props.name === '__SUBMIT_BUTTON__'
            ) {
                e.onStoreChange();
            }
        });
    };
}

function shallowEqualRecords(
    a?: Record<string, unknown>,
    b?: Record<string, unknown>
): boolean {
    if (a === b) return true;
    if (!a || !b) return false;
    const ka = Object.keys(a);
    const kb = Object.keys(b);
    if (ka.length !== kb.length) return false;
    for (const k of ka) {
        if (a[k] !== b[k]) return false;
    }
    return true;
}

// --- 3. React 組件與 Hooks ---
const FormContext = createContext<any>(null);

function useForm<Values extends Record<string, any> = any>(initialValues?: Values) {
    const formRef = useRef<FormStore<Values>>();
    if (!formRef.current) formRef.current = new FormStore<Values>(initialValues);
    return [formRef.current] as const;
}

function useWatch<T = any, Values extends Record<string, any> = any>(name?: string | string[], form?: FormStore): T {
    const [, forceUpdate] = useReducer(x => x + 1, 0);
    const context = useContext(FormContext);
    const formInstance = form || context?.formInstance;
    const namePath = Array.isArray(name) ? name.join('.') : name;

    useLayoutEffect(() => {
        if (!formInstance) return;
        return formInstance.registerField({ props: { name: namePath }, onStoreChange: forceUpdate });
    }, [formInstance, namePath]);

    return namePath ? formInstance?.getFieldValue(namePath) : formInstance?.getFieldsValue();
}

export function Form<Values extends Record<string, any> = any>({
    children,
    onFinish,
    initialValues,
    layout = 'vertical',
    labelCol,
    form
}: any) {
    const [internalForm] = useForm<Values>(initialValues);
    const formInstance = form || internalForm;
    const prevInitialRef = useRef<Partial<Values> | undefined>(undefined);

    useLayoutEffect(() => {
        if (initialValues == null || Object.keys(initialValues).length === 0) return;
        if (
            prevInitialRef.current !== undefined &&
            shallowEqualRecords(
                prevInitialRef.current as Record<string, unknown>,
                initialValues as Record<string, unknown>
            )
        ) {
            return;
        }
        prevInitialRef.current = initialValues;
        formInstance.setFieldsValue(initialValues);
        formInstance.syncInitialValues();
    }, [formInstance, initialValues]);

    return (
        <FormContext.Provider value={{ formInstance, layout, labelCol }}>
            <form onSubmit={async (e) => {
                e.preventDefault();
                if (await formInstance.validateAll()) onFinish?.(formInstance.getFieldsValue());
            }}>{children}</form>
        </FormContext.Provider>
    );
}

const FormItem = ({
    name,
    label,
    autoFocus,
    rules,
    children,
    validateTrigger = 'onChange',
    normalize,
    dependencies,
    ...rest
}: any) => {
    const { formInstance, layout, labelCol } = useContext(FormContext);
    const [, forceUpdate] = useReducer(x => x + 1, 0);

    const inputRef = useRef<any>(null);

    if (name != null && name !== '' && name !== '__SUBMIT_BUTTON__') {
        formInstance.syncFieldRuntime(String(name), {
            rules,
            normalize,
            dependencies,
            validateTrigger
        });
    }

    useLayoutEffect(() => {
        return formInstance.registerField({
            props: { name, rules, normalize, dependencies, validateTrigger },
            onStoreChange: forceUpdate,
            // --- 新增：将聚焦逻辑传给 Store ---
            focus: () => {
                const el = inputRef.current;
                if (!el) return;
                // 尝试直接 focus 或向下寻找 input
                if (typeof el.focus === 'function') {
                    el.focus();
                } else {
                    el.querySelector?.('input, textarea, select, [tabindex]')?.focus();
                }
                // 滚动到视口，避免被遮挡
                el.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
            },
            _isField: true // 内部标识
        });
    }, [formInstance, name, rules, normalize, dependencies, validateTrigger]);

    const hasFieldName = name != null && name !== '' && name !== '__SUBMIT_BUTTON__';

    // 在你的 useLayoutEffect 之后增加这个针对 autoFocus 的逻辑
    useLayoutEffect(() => {
        // 如果设置了 autoFocus 属性
        if (autoFocus && hasFieldName) {
            // 延迟 200ms 以避开 Dialog 的动画和 Portal 挂载延迟
            const timer = setTimeout(() => {
                const el = inputRef.current;
                if (!el) return;

                // 逻辑复用：直接调用你已经写好的聚焦逻辑
                if (typeof el.focus === 'function') {
                    el.focus();
                } else {
                    el.querySelector?.('input, textarea, select, [tabindex]')?.focus();
                }
            }, 0); 

            return () => clearTimeout(timer);
        }
    }, [autoFocus, hasFieldName]); // 仅在挂载或 autoFocus 属性变化时触发

    const error = hasFieldName ? formInstance.getFieldError(name) : undefined;
    const isRequired = rules?.some((r: any) => r.required);

    const childNode =
        hasFieldName && React.isValidElement(children)
            ? cloneElement(children as any, {
                ref: inputRef,
                value: formInstance.getFieldValue(name) ?? '',
                status: error ? 'error' : undefined,
                onChange: (...args: any[]) => {
                    const prev = (children as React.ReactElement<any>).props.onChange;
                    const first = args[0];
                    const val =
                        first &&
                            typeof first === 'object' &&
                            'target' in first &&
                            (first as React.ChangeEvent<HTMLInputElement>).target != null
                            ? (first as React.ChangeEvent<HTMLInputElement>).target.value
                            : first;
                    formInstance.setFieldValue(
                        name,
                        val,
                        validateTrigger === 'onChange' ? rules : undefined
                    );
                    prev?.(...args);
                },
                onBlur: (e: any) => {
                    const prev = (children as React.ReactElement<any>).props.onBlur;
                    prev?.(e);
                    if (validateTrigger === 'onBlur') {
                        formInstance.validateField(name, rules || []);
                    }
                }
            })
            : children;

    const isHorizontal = layout === 'horizontal';
    const errorCls = [`${CLASSNAME}-form-error-message`, error ? `${CLASSNAME}-form-error-message-active` : ''].join(' ');

    return (
        <div className={`${CLASSNAME}-form-item-container ${CLASSNAME}-form-${layout}`} {...rest}>
            {label && (
                <div className={`${CLASSNAME}-form-item-label`} style={{ width: isHorizontal ? `${(labelCol?.span / 24) * 100}%` : '100%', textAlign: isHorizontal ? 'right' : 'left', paddingRight: isHorizontal ? 12 : 0 }}>
                    {isRequired && <span className={`${CLASSNAME}-form-required-mark`}>*</span>}
                    {label}
                </div>
            )}
            <div className={`${CLASSNAME}-form-item-control`}>
                {childNode}
                {/* {isValidating && <div className={`${CLASSNAME}-form-validating-text`}>校驗中...</div>} */}
                <div className={errorCls}>{error}</div>
            </div>
        </div>
    );
};

const SubmitButton = ({ children, ...rest }: any) => {
    const { formInstance } = useContext(FormContext);
    const [, forceUpdate] = useReducer(x => x + 1, 0);

    useLayoutEffect(() => {
        return formInstance.registerField({
            props: { name: '__SUBMIT_BUTTON__' },
            onStoreChange: forceUpdate
        });
    }, [formInstance]);
    return <Button type="submit" {...rest}>{children}</Button>;
};

// 掛載靜態屬性
Form.Item = FormItem;
Form.useForm = useForm;
Form.useWatch = useWatch;
Form.SubmitButton = SubmitButton;

export default Form;
