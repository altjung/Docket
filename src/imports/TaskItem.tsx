import svgPaths from "./svg-ajoqg632kd";
import { imgEmergencyHeat } from "./svg-vece3";

function Frame() {
  return (
    <div className="content-stretch flex flex-col items-start justify-center relative shrink-0">
      <p className="font-['Inter:Regular',sans-serif] font-normal leading-[0] not-italic relative shrink-0 text-[14px] text-black whitespace-nowrap">
        <span className="leading-[normal] text-[#bfe260]">|</span>
        <span className="leading-[normal]">Task Name...</span>
      </p>
    </div>
  );
}

function Frame8() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[12px] items-center justify-end min-h-px min-w-px relative">
      <div className="bg-[#a0a0a0] content-stretch flex gap-[5px] items-center justify-center min-h-[22.775999790072433px] min-w-[22.775999790072433px] p-[6px] relative rounded-[62.5px] shrink-0 size-[22.776px]" data-name="Priority">
        <div className="mask-alpha mask-intersect mask-no-clip mask-no-repeat mask-position-[-8.297px_-8.297px] mask-size-[28.47px_28.47px] relative shrink-0 size-[9.5px]" data-name="emergency_heat" style={{ maskImage: `url('${imgEmergencyHeat}')` }}>
          <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 9.5 9.5">
            <path d={svgPaths.p2f12b280} fill="var(--fill-0, white)" id="emergency_heat" />
          </svg>
        </div>
      </div>
      <div className="bg-[#a0a0a0] content-stretch flex flex-col gap-[5px] items-center justify-center min-h-[22.775999790072433px] min-w-[22.775999790072433px] p-[6px] relative rounded-[62.5px] shrink-0 size-[22.776px]" data-name="Priority">
        <div className="h-[9px] mask-alpha mask-intersect mask-no-clip mask-no-repeat mask-position-[-7.985px_-8.61px] mask-size-[28.47px_28.47px] relative shrink-0 w-[10px]" data-name="siren" style={{ maskImage: `url('${imgEmergencyHeat}')` }}>
          <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 10 9">
            <path d={svgPaths.p13739f0} fill="var(--fill-0, white)" id="siren" />
          </svg>
        </div>
      </div>
      <div className="bg-[#a0a0a0] content-stretch flex flex-col gap-[5px] items-center justify-center min-h-[22.775999790072433px] min-w-[22.775999790072433px] p-[6px] relative rounded-[62.5px] shrink-0 size-[22.776px]" data-name="Priority">
        <div className="h-[10.25px] mask-alpha mask-intersect mask-no-clip mask-no-repeat mask-position-[-7.501px_-7.829px] mask-size-[28.47px_28.47px] relative shrink-0 w-[10.775px]" data-name="celebration" style={{ maskImage: `url('${imgEmergencyHeat}')` }}>
          <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 10.775 10.25">
            <path d={svgPaths.p10a4c00} fill="var(--fill-0, white)" id="celebration" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function Frame9() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0 w-full">
      <Frame />
      <Frame8 />
    </div>
  );
}

function Frame1() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 w-full">
      <p className="font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[8px] text-black text-center tracking-[-0.16px] whitespace-nowrap">15 min</p>
    </div>
  );
}

function Button() {
  return (
    <div className="bg-[#d6d6d6] flex-[1_0_0] min-h-px min-w-px relative rounded-[8px]" data-name="Button">
      <div className="flex flex-col items-center justify-center overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex flex-col items-center justify-center p-[8px] relative w-full">
          <Frame1 />
        </div>
      </div>
    </div>
  );
}

function Frame2() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 w-full">
      <p className="font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[8px] text-black text-center tracking-[-0.16px] whitespace-nowrap">30 mins</p>
    </div>
  );
}

function Button1() {
  return (
    <div className="bg-[#d6d6d6] flex-[1_0_0] min-h-px min-w-px relative rounded-[8px]" data-name="Button">
      <div className="flex flex-col items-center justify-center overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex flex-col items-center justify-center p-[8px] relative w-full">
          <Frame2 />
        </div>
      </div>
    </div>
  );
}

function Frame3() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 w-full">
      <p className="font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[8px] text-black text-center tracking-[-0.16px] whitespace-nowrap">1 hour</p>
    </div>
  );
}

function Button2() {
  return (
    <div className="bg-[#d6d6d6] flex-[1_0_0] min-h-px min-w-px relative rounded-[8px]" data-name="Button">
      <div className="flex flex-col items-center justify-center overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex flex-col items-center justify-center p-[8px] relative w-full">
          <Frame3 />
        </div>
      </div>
    </div>
  );
}

function Frame4() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 w-full">
      <p className="font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[8px] text-black text-center tracking-[-0.16px] whitespace-nowrap">2 hours</p>
    </div>
  );
}

function Button3() {
  return (
    <div className="bg-[#d6d6d6] flex-[1_0_0] min-h-px min-w-px relative rounded-[8px]" data-name="Button">
      <div className="flex flex-col items-center justify-center overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex flex-col items-center justify-center p-[8px] relative w-full">
          <Frame4 />
        </div>
      </div>
    </div>
  );
}

function Frame10() {
  return (
    <div className="content-stretch flex gap-[4px] items-start relative shrink-0 w-full">
      <Button />
      <Button1 />
      <Button2 />
      <Button3 />
    </div>
  );
}

function Frame5() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 w-full">
      <p className="font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[12px] text-black text-center tracking-[-0.24px] whitespace-nowrap">Add</p>
    </div>
  );
}

function Frame6() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 w-full">
      <p className="font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[12px] text-black text-center tracking-[-0.24px] whitespace-nowrap">Cancel</p>
    </div>
  );
}

function Frame11() {
  return (
    <div className="content-stretch flex gap-[10px] items-start relative shrink-0 w-full">
      <div className="bg-[#bfe260] flex-[1_0_0] min-h-px min-w-px relative rounded-[12px]" data-name="Button">
        <div className="flex flex-col items-center justify-center overflow-clip rounded-[inherit] size-full">
          <div className="content-stretch flex flex-col items-center justify-center px-[16px] py-[8px] relative w-full">
            <Frame5 />
          </div>
        </div>
      </div>
      <div className="bg-[#d9d9d9] flex-[1_0_0] min-h-px min-w-px relative rounded-[12px]" data-name="Button">
        <div className="flex flex-col items-center justify-center overflow-clip rounded-[inherit] size-full">
          <div className="content-stretch flex flex-col items-center justify-center px-[16px] py-[8px] relative w-full">
            <Frame6 />
          </div>
        </div>
      </div>
    </div>
  );
}

function Frame7() {
  return (
    <div className="content-stretch flex flex-[1_0_0] flex-col gap-[12px] items-start justify-center min-h-px min-w-px relative">
      <Frame9 />
      <Frame10 />
      <Frame11 />
    </div>
  );
}

export default function TaskItem() {
  return (
    <div className="bg-[#e9e7e7] content-stretch flex items-center overflow-clip p-[16px] relative rounded-[16px] size-full" data-name="Task Item">
      <Frame7 />
    </div>
  );
}