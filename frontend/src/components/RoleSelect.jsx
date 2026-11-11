import { useI18n } from "@/lib/i18n";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function RoleSelect({ value, onChange, testId, className = "" }) {
  const { t } = useI18n();
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger data-testid={testId} className={className}><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="editor" data-testid={`${testId}-editor`}>{t("can_post")}</SelectItem>
        <SelectItem value="viewer" data-testid={`${testId}-viewer`}>{t("can_view")}</SelectItem>
      </SelectContent>
    </Select>
  );
}
