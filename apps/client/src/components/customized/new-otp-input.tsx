import {
    InputOTP,
    InputOTPGroup,
    InputOTPSeparator,
    InputOTPSlot,
} from "@/components/ui/input-otp";

export default function NewOTPInput({
    maxLength,
    groups,
    value,
    onChange,
}: {
    maxLength: number;
    groups: number[];
    value: string;
    onChange: (value: string) => void;
}) {
    let currentIndex = 0;

    return (
        <InputOTP maxLength={maxLength} value={value} onChange={onChange}>
            {groups.map((groupSize, groupIndex) => (
                <InputOTPGroup key={groupIndex}>
                    {Array.from({ length: groupSize }).map((_, slotIndex) => {
                        const slot = (
                            <InputOTPSlot
                                className="bg-white"
                                key={slotIndex}
                                index={currentIndex++}
                            />
                        );
                        return slot;
                    })}
                    {groupIndex < groups.length - 1 && <InputOTPSeparator />}
                </InputOTPGroup>
            ))}
        </InputOTP>
    );
}